import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { resetMocks } from './dailyReload/mocks';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import {
  deserializeTycoon, newTycoon, orderMatchProgrammes, playAwayMatchdays, playMinute, programmeFixture,
  serializeTycoon, TYCOON_SAVE_KEY, type ProgrammeRun, type TycoonState,
} from '@/lib/stadiumTycoon';

const now = 1794085200000;
const reload = (s: TycoonState) => deserializeTycoon(serializeTycoon(s, now), now)!;
const finishMatch = (s: TycoonState) => {
  s.minute = 89;
  playMinute(s, () => 1, [], { pay: true });
};
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetMocks(); });

it.each([
  ['short', 120, 15, 30, 15, 15],
  ['bulk', 120, 30, 45, 30, 45],
  ['short', 40, 15, 30, 10, 0],
  ['bulk', 40, 30, 45, 10, -15],
] as const)('settles a %s run against %i fans once and keeps its season receipt', (run: ProgrammeRun, fans, copies, cost, sold, profit) => {
  const standard = reload({ ...newTycoon(now), money: 500, fanbase: fans });
  const fixture = programmeFixture(standard)!;
  const quote = fixture[run];
  expect(quote).toEqual({ run, copies, cost, price: 3 });
  const booked = reload(orderMatchProgrammes(standard, standard.rep, fixture.match, quote));
  expect(booked.money).toBe(standard.money - cost);
  expect(booked.lifetime).toBe(standard.lifetime);
  expect(orderMatchProgrammes(booked, standard.rep, fixture.match, quote)).toBe(booked);

  const control = playAwayMatchdays(standard, 2, () => 1).state;
  let actual = reload(playAwayMatchdays(booked, 2, () => 1).state);
  expect(actual.league?.results?.[0]).toEqual(control.league?.results?.[0]);
  expect(actual.league?.results?.[1]).toEqual({ ...control.league?.results?.[1], programmes: { ...quote, sold } });
  expect(actual.money - control.money).toBe(profit);
  expect(actual.lifetime - control.lifetime).toBe(sold * 3);
  expect(actual.programmeOrder).toBeUndefined();
  expect(orderMatchProgrammes(actual, standard.rep, fixture.match, quote)).toBe(actual);
  while (actual.league!.season === 0) { finishMatch(actual); finishMatch(control); }
  actual = reload(actual);
  expect(actual.lastCompletedLeague?.results?.filter(r => r.programmes).map(r => r.programmes)).toEqual([{ ...quote, sold }]);
  expect(actual.money - control.money).toBe(profit);
  expect(actual.lifetime - control.lifetime).toBe(sold * 3);
});

it('protects the quoted edition and print cost across upgrades, older saves and partial receipts', () => {
  const s = reload({ ...newTycoon(now), money: 200 });
  const fixture = programmeFixture(s)!;
  expect(orderMatchProgrammes(s, s.rep + 1, fixture.match, fixture.short)).toBe(s);
  const poor = { ...s, money: 29 };
  expect(orderMatchProgrammes(poor, s.rep, fixture.match, fixture.short)).toBe(poor);
  const expanded = { ...s, levels: { ...s.levels, stands: 1 } };
  expect(orderMatchProgrammes(expanded, s.rep, fixture.match, fixture.short)).toBe(expanded);
  const ordered = orderMatchProgrammes(s, s.rep, fixture.match, fixture.short);
  const grown = reload({ ...ordered, levels: expanded.levels });
  expect(grown.programmeOrder).toEqual({ ...fixture.short, match: fixture.match });
  expect(reload({ ...grown, programmeOrder: { ...grown.programmeOrder!, cost: 1 } }).programmeOrder).toBeUndefined();
  const { league: _league, ...preLeague } = { ...s, minute: 47 };
  const older = reload(preLeague);
  expect(older.league?.carryover).toBe('Ironbridge Rovers');
  expect(older.programmeOrder).toBeUndefined();
  expect(programmeFixture(older)?.day).toBe(1);
  const oldOrder = orderMatchProgrammes(older, older.rep, fixture.match, fixture.short);
  const after = playAwayMatchdays(oldOrder, 2, () => 1).state;
  expect(after.league?.results?.[0].programmes?.sold).toBe(15);
  after.league!.results![0].programmes!.sold = 99;
  expect(reload(after).league?.results?.[0]).toMatchObject({ day: 1, gf: 0, ga: 0 });
  expect(reload(after).league?.results?.[0].programmes).toBeUndefined();
});

it('books from Ticket offer only after a successful save and reopens the paid order', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const raw = serializeTycoon(newTycoon(now), now);
  localStorage.setItem(TYCOON_SAVE_KEY, raw);
  const native = Storage.prototype.setItem;
  let fail = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
    if (fail && key === TYCOON_SAVE_KEY) throw new DOMException('Write refused', 'QuotaExceededError');
    native.call(this, key, value);
  });
  const ticketOffice = async () => fireEvent.click(await screen.findByRole('button', { name: /Ticket offer/ }));
  const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  await ticketOffice();
  fireEvent.click(screen.getByText('Match programmes'));
  const short = screen.getByRole('button', { name: /Short run/ });
  expect(screen.getByRole('button', { name: /Bulk run/ })).toBeDisabled();
  fireEvent.click(short);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save the print order');
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(raw);
  fail = false;
  fireEvent.click(short);
  expect(screen.getByText('Programme order booked')).toBeVisible();
  expect(deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)?.money).toBe(10);
  view.unmount();
  mountPage(<StadiumTycoon />, '/stadium-tycoon');
  await ticketOffice();
  fireEvent.click(screen.getByText('Programme order booked'));
  expect(screen.getByText('15 printed · $30 paid · $3 per sale')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Short run/ })).toBeNull();
});
