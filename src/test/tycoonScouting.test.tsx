import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon, { SeasonMatchResults } from '@/pages/StadiumTycoon';
import {
  bookMatchScouting, deserializeTycoon, goalChancePerMin, leagueShape, matchScoutingDetails, newTycoon,
  oppChancePerMin, playAwayMatchdays, playMinute, serializeTycoon, TYCOON_SAVE_KEY, type TycoonState,
} from '@/lib/stadiumTycoon';

const now = 1794085200000;
const reload = (state: TycoonState) => deserializeTycoon(serializeTycoon(state, now), now)!;

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetMocks();
});

it('commits the scouting charge only after saving and reopens the booking from League', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const initial = { ...newTycoon(now), money: 500 };
  const raw = serializeTycoon(initial, now);
  localStorage.setItem(TYCOON_SAVE_KEY, raw);
  const nativeSet = Storage.prototype.setItem;
  let refuse = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
    if (refuse && key === TYCOON_SAVE_KEY) throw new DOMException('Controlled write refusal', 'QuotaExceededError');
    nativeSet.call(this, key, value);
  });

  const openLeague = async () => fireEvent.click(await screen.findByRole('button', { name: /League/ }));
  const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  await openLeague();
  fireEvent.click(screen.getByText('Next match scouting'));
  fireEvent.click(screen.getByRole('button', { name: /Book scouting.*\$108/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save the scouting booking');
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(raw);
  expect(recordCompletion).not.toHaveBeenCalled();

  refuse = false;
  fireEvent.click(screen.getByRole('button', { name: /Book scouting.*\$108/ }));
  expect(screen.getByText('Scouting booked')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Book scouting/ })).toBeNull();
  expect(recordCompletion).toHaveBeenCalledOnce();
  const saved = localStorage.getItem(TYCOON_SAVE_KEY)!;
  expect(deserializeTycoon(saved, now)).toMatchObject({ money: 392, scouting: { match: 1, fee: 108, reduction: 10 } });
  view.unmount();
  mountPage(<StadiumTycoon />, '/stadium-tycoon');
  await openLeague();
  expect(screen.getByText('Scouting booked')).toBeVisible();
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(saved);
});

it('scouts only the quoted opponent and uses the same two rolls at full time', () => {
  const s = { ...newTycoon(now), money: 500, minute: 89 };
  const quote = matchScoutingDetails(s)!;
  expect(quote).toMatchObject({ day: 2, match: 1, fee: 108, reduction: 10 });
  expect(bookMatchScouting({ ...s, money: 107 }, s.rep, quote.match, quote.fee)).not.toHaveProperty('scouting');
  expect(bookMatchScouting(s, s.rep + 1, quote.match, quote.fee)).toBe(s);
  expect(bookMatchScouting(s, s.rep, quote.match, quote.fee - 1)).toBe(s);
  const scouted = reload(bookMatchScouting(s, s.rep, quote.match, quote.fee));
  expect(bookMatchScouting(scouted, s.rep, quote.match, quote.fee)).toBe(scouted);
  expect(oppChancePerMin(scouted)).toBe(oppChancePerMin(s));
  const normal = reload(s);
  playMinute(normal, () => 1, [], { pay: true });
  playMinute(scouted, () => 1, [], { pay: true });
  expect(scouted.league?.results).toEqual(normal.league?.results);
  expect(scouted.money).toBe(normal.money - quote.fee);
  expect(matchScoutingDetails(scouted)).toEqual(quote);

  const prepared = reload({ ...scouted, minute: 89, goalsFor: 1 });
  const control = { ...normal, minute: 89, goalsFor: 1 };
  const rivalRoll = oppChancePerMin(control, 0.12) * 0.95;
  expect(goalChancePerMin(prepared)).toBe(goalChancePerMin(control));
  expect(oppChancePerMin(prepared, 0.12)).toBeCloseTo(oppChancePerMin(control, 0.12) * 0.90, 14);
  const rng = vi.fn(() => 1).mockReturnValueOnce(1).mockReturnValueOnce(rivalRoll);
  playMinute(control, rng, [], { pay: true }, 0.12);
  expect(rng).toHaveBeenCalledTimes(2);
  rng.mockClear().mockReturnValueOnce(1).mockReturnValueOnce(rivalRoll);
  playMinute(prepared, rng, [], { pay: true }, 0.12);
  expect(rng).toHaveBeenCalledTimes(2);
  expect(control.league?.results?.[1]).toMatchObject({ day: 2, gf: 1, ga: 1 });
  expect(prepared.league?.results?.[1]).toMatchObject({ day: 2, gf: 1, ga: 0, scouting: { fee: 108, reduction: 10 } });
  expect(prepared.scouting).toBeUndefined();
  expect(bookMatchScouting(prepared, s.rep, quote.match, quote.fee)).toBe(prepared);
  const settled = reload(prepared);
  render(<SeasonMatchResults league={settled.league!} current />);
  fireEvent.click(screen.getByText('Results this season'));
  expect(screen.getByText('Scouting · $108 paid · 10% lower opponent scoring chance')).toBeVisible();
});

it('carries a booking through an older friendly and records the league match while away', () => {
  const start = { ...newTycoon(now), money: 500, minute: 21 };
  const { league: _league, ...legacy } = start;
  const old = deserializeTycoon(serializeTycoon(legacy, now), now)!;
  expect(old.league?.carryover).toBeTruthy();
  expect(old.scouting).toBeUndefined();
  const quote = matchScoutingDetails(old)!;
  expect(quote.day).toBe(1);
  const booked = reload(bookMatchScouting(old, old.rep, quote.match, quote.fee));
  const normal = playAwayMatchdays(old, 3, () => 1);
  const prepared = playAwayMatchdays(booked, 3, () => 1);
  expect(prepared.results).toEqual(normal.results);
  expect(prepared.results.map(match => match.friendly)).toEqual([true, false, false]);
  expect(prepared.state.money).toBe(normal.state.money - quote.fee);
  expect(prepared.state.scouting).toBeUndefined();
  expect(reload(prepared.state).league?.results?.map(match => match.scouting)).toEqual([
    { fee: quote.fee, reduction: 10 }, undefined,
  ]);
});

it('keeps the scouting receipt in the completed season and disregards invalid bookings', () => {
  const s = { ...newTycoon(now), money: 500 };
  const quote = matchScoutingDetails(s)!;
  const booked = bookMatchScouting(s, s.rep, quote.match, quote.fee);
  expect(reload({ ...booked, scouting: { match: quote.match + 2, fee: quote.fee, reduction: 10 } }).scouting).toBeUndefined();
  expect(reload({ ...booked, scouting: { match: quote.match, fee: -1, reduction: 10 } }).scouting).toBeUndefined();
  const finished = reload(booked);
  const days = leagueShape(finished.league!.division).matchdays;
  for (let day = 0; day < days; day++) {
    if (day === days - 1) expect(matchScoutingDetails(finished)).toBeNull();
    finished.minute = 89;
    playMinute(finished, () => 1, [], { pay: true });
  }
  expect(reload(finished).lastCompletedLeague?.results?.map(match => match.scouting)).toEqual([
    undefined, { fee: quote.fee, reduction: 10 }, undefined, undefined, undefined,
  ]);
  expect(finished.scouting).toBeUndefined();
});
