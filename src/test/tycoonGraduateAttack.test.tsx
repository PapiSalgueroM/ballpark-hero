import { act, cleanup, fireEvent, renderHook, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import { resetMocks } from './dailyReload/mocks';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { BOOT_IDS } from '@/lib/soccerBootIds';
import { balance, GEM_PAY, newLedger, REWARDS_KEY } from '@/lib/tycoonRewards';
import { fenceKeyOf } from '@/lib/saveFence';
import {
  AWAY_MATCHDAY_SEC, TYCOON_SAVE_KEY, bookGraduateAttack, deserializeTycoon, goalChancePerMin,
  graduateAttackFixture, newTycoon, oppChancePerMin, playAwayMatchdays, playMinute, serializeTycoon, type TycoonState,
} from '@/lib/stadiumTycoon';
import { SAVE_KEY, RETIRE_AGE, SENIOR_YEAR_SEC, deserialize, graduateAttackOptions, newFactory, serialize, squadEdge, type Senior } from '@/lib/wonderkidFactory';

const now = 1794085200000;
const forward: Senior = { id: 'sr-fixture-fw', name: 'Fixture Forward', nation: 'England', pos: 'FW', age: 23, ageClock: 0, rating: 90, potential: 90 };
const defender: Senior = { ...forward, id: 'sr-fixture-df', name: 'Fixture Defender', pos: 'DF' };
const academy = (firstTeam = [forward, defender]) => ({ ...newFactory(now, 586), firstTeam });
const quote = () => graduateAttackOptions(academy())[0];
const resolveForward = (id: string) => id === forward.id ? quote() : undefined;
const reload = (s: TycoonState) => deserializeTycoon(serializeTycoon(s, now), now)!;

function nextFixture() {
  const initial = { ...newTycoon(now), minute: 89 };
  const fixture = graduateAttackFixture(initial)!;
  expect(fixture).toMatchObject({ match: 1, day: 2 });
  const booked = reload(bookGraduateAttack(initial, initial.rep, fixture.match, quote()));
  const usual = reload(initial);
  for (const state of [booked, usual]) playMinute(state, () => 1, [], { pay: true }, 0.12, resolveForward);
  expect(booked.league?.results).toEqual(usual.league?.results);
  expect(booked.graduateAttack).toMatchObject({ match: 1, playerId: forward.id });
  return { usual, booked: reload(booked) };
}

function fixtureClock(time = now) {
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(Date, 'now').mockReturnValue(time);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => { frames.set(++nextId, next); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  return (milliseconds: number) => act(() => {
    const pending = [...frames.values()];
    frames.clear();
    for (const frame of pending) frame(milliseconds);
  });
}

function refuseStadiumWrites() {
  const nativeSet = Storage.prototype.setItem;
  let refuse = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
    if (refuse && key === TYCOON_SAVE_KEY) throw new DOMException('Fixture write refusal', 'QuotaExceededError');
    nativeSet.call(this, key, value);
  });
  return () => { refuse = false; };
}

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetMocks(); });

it('shifts the actual share from the five capped totals and counts each boot once', () => {
  const boots = { [BOOT_IDS[0]]: 3 };
  const s = academy([{ ...defender, bootId: BOOT_IDS[0] }, { ...forward, bootId: BOOT_IDS[0] },
    { ...forward, id: 'sr-no-edge', rating: 60 }, { ...defender, id: 'sr-another-df', rating: 99 },
    { ...defender, id: 'sr-mf', pos: 'MF', rating: 99 }, { ...forward, id: 'sr-sixth', rating: 99 }]);
  const offers = graduateAttackOptions(s, boots);
  expect(offers.map(offer => offer.playerId)).toEqual([forward.id]);
  expect(offers[0].attack).toBeCloseTo(0.06, 12);
  expect(offers[0].defence + offers[0].attack).toBeCloseTo(squadEdge(s, boots), 12);
  expect(graduateAttackOptions(academy([{ ...forward, bootId: BOOT_IDS[0] }]), boots)[0].attack).toBeCloseTo(0.066, 12);
});

it.each(['watched', 'away'] as const)('uses the same %s rolls for attacking upside and defensive cost', mode => {
  for (const upside of [true, false]) {
    const { usual, booked } = nextFixture();
    const attackRoll = goalChancePerMin(usual) * (upside ? 1.03 : 0.5);
    const defenceRoll = (oppChancePerMin(usual, 0.12) + oppChancePerMin(usual, 0.06)) / 2;
    const roll = () => vi.fn(() => 1).mockReturnValueOnce(attackRoll).mockReturnValueOnce(1)
      .mockReturnValueOnce(1).mockReturnValueOnce(upside ? 1 : defenceRoll);
    const play = (state: TycoonState) => {
      const rng = roll();
      if (mode === 'away') state = playAwayMatchdays(state, 1, rng, 0.12, resolveForward).state;
      else for (let i = 0; i < 90; i++) playMinute(state, rng, [], { pay: true }, 0.12, resolveForward);
      expect(rng).toHaveBeenCalledTimes(180);
      return reload(state);
    };
    const control = play(usual), prepared = play(booked);
    expect(control.league?.results?.[1]).toMatchObject({ gf: upside ? 0 : 1, ga: 0 });
    expect(prepared.league?.results?.[1]).toMatchObject({ gf: 1, ga: upside ? 0 : 1, graduateAttack: { name: forward.name } });
    expect(prepared.league?.results?.[1].graduateAttack?.share).toBeCloseTo(0.06, 12);
    expect(prepared.graduateAttack).toBeUndefined();
    expect(graduateAttackFixture(prepared)).toMatchObject({ match: 3, day: 4 });
  }
});

it('settles a sold forward as unused and keeps a played kickoff snapshot through reload', () => {
  const { booked } = nextFixture();
  const sold = playAwayMatchdays(booked, 1, () => 1, 0.12, () => undefined).state;
  expect(reload(sold).league?.results?.[1].graduateAttack).toEqual({ name: forward.name, share: 0 });
  const active = reload(booked);
  playMinute(active, () => 1, [], { pay: true }, 0.12, resolveForward);
  const resumed = reload(active);
  const resolver = vi.fn(() => undefined);
  const done = playAwayMatchdays(resumed, 1, () => 1, 0.12, resolver).state;
  expect(resolver).not.toHaveBeenCalled();
  expect(reload(done).league?.results?.[1].graduateAttack?.share).toBeCloseTo(0.06, 12);
});

it('rechecks the shared academy on booking and only shows a successfully saved booking', async () => {
  fixtureClock();
  const initial = serializeTycoon(newTycoon(now), now);
  localStorage.setItem(TYCOON_SAVE_KEY, initial);
  localStorage.setItem(SAVE_KEY, serialize(academy()));
  const allow = refuseStadiumWrites();
  const first = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  fireEvent.click(await screen.findByRole('button', { name: /League/ }));
  fireEvent.click(screen.getByText('Graduate in attack'));
  const book = screen.getByRole('button', { name: 'Start Fixture Forward in attack' });
  fireEvent.click(book);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save the attacking assignment');
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(initial);

  allow();
  localStorage.setItem(SAVE_KEY, serialize(academy([defender])));
  fireEvent.click(book);
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(initial);
  first.unmount();
  localStorage.setItem(SAVE_KEY, serialize(academy()));
  mountPage(<StadiumTycoon />, '/stadium-tycoon');
  fireEvent.click(await screen.findByRole('button', { name: /League/ }));
  fireEvent.click(screen.getByText('Graduate in attack'));
  fireEvent.click(screen.getByRole('button', { name: 'Start Fixture Forward in attack' }));
  expect(deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)?.graduateAttack).toMatchObject({ match: 1, playerId: forward.id });
  expect(screen.getByText('Attacking assignment booked')).toBeVisible();
});

it.each(['watched', 'away'] as const)('retries the exact %s result after a refused write, despite a new roll or a sold graduate', mode => {
  const { booked } = nextFixture();
  if (mode === 'watched') {
    playMinute(booked, () => 1, [], { pay: true }, 0.12, resolveForward);
    booked.minute = 89;
    booked.goalsFor = 1;
  }
  const frame = fixtureClock();
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  if (mode === 'away') random.mockReturnValueOnce(0);
  const savedAt = mode === 'away' ? now - AWAY_MATCHDAY_SEC * 1000 : now;
  const bytes = serializeTycoon(booked, savedAt);
  const ledger = JSON.stringify(newLedger(586));
  localStorage.setItem(TYCOON_SAVE_KEY, bytes);
  localStorage.setItem(REWARDS_KEY, ledger);
  localStorage.setItem(SAVE_KEY, serialize(academy()));
  const allow = refuseStadiumWrites();
  const readOptions = vi.fn(() => graduateAttackOptions(deserialize(localStorage.getItem(SAVE_KEY), now)!));
  const { result } = renderHook(() => useStadiumTycoon(() => 0.12, readOptions));
  if (mode === 'watched') frame(2000);
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(bytes);
  expect(localStorage.getItem(REWARDS_KEY)).toBe(ledger);
  expect(result.current.state.league?.matchday).toBe(1);
  expect(result.current.state.league?.results?.[1]).toBeUndefined();
  expect(result.current.awayTrip).toBeNull();
  expect(result.current.ticketSaveFailed).toBe(true);

  allow();
  random.mockReturnValue(0);
  localStorage.setItem(SAVE_KEY, serialize(academy([defender])));
  act(() => {
    result.current.doSetTicketPolicy('premium');
    result.current.doTap(10, 10);
  });
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(bytes);
  expect(result.current.ticketSaveFailed).toBe(true);
  const previousReads = readOptions.mock.calls.length;
  act(() => { result.current.retryTicketSave(); });
  expect(result.current.ticketSaveFailed).toBe(false);
  expect(readOptions).toHaveBeenCalledTimes(previousReads);
  const settled = deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)!;
  expect(settled.league?.results?.[1]).toMatchObject({ gf: 1, ga: 0, graduateAttack: { name: forward.name } });
  expect(settled.league?.results?.[1].graduateAttack?.share).toBeCloseTo(0.06, 12);
  expect(result.current.state.league?.matchday).toBe(2);
  const paidLedger = localStorage.getItem(REWARDS_KEY)!;
  expect(balance(JSON.parse(paidLedger))).toBe(mode === 'watched' ? GEM_PAY.win : GEM_PAY.awayWin);
  act(() => { result.current.retryTicketSave(); });
  expect(localStorage.getItem(REWARDS_KEY)).toBe(paidLedger);
  expect(result.current.state.league?.results?.filter(row => row.graduateAttack)).toHaveLength(1);
});

it.each(['live retirement', 'sibling sale'] as const)('uses the authoritative academy at kickoff after %s', async cause => {
  const { booked } = nextFixture();
  const frame = fixtureClock();
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const senior = cause === 'live retirement' ? { ...forward, age: RETIRE_AGE - 1, ageClock: SENIOR_YEAR_SEC - 0.1 } : forward;
  localStorage.setItem(SAVE_KEY, serialize(academy([senior, defender])));
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(booked, now));
  mountPage(<StadiumTycoon />, '/stadium-tycoon');
  const rooms = await screen.findByRole('group', { name: 'Tycoon rooms' });
  fireEvent.click(within(rooms).getByRole('button', { name: /Academy/ }));
  await screen.findByText('First team', { exact: true });
  if (cause === 'live retirement') {
    vi.mocked(Date.now).mockReturnValue(now + 250);
    act(() => { vi.advanceTimersByTime(250); });
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).firstTeam.map((p: Senior) => p.id)).toContain(forward.id);
  } else {
    localStorage.setItem(SAVE_KEY, serialize(academy([defender])));
    localStorage.setItem(fenceKeyOf(SAVE_KEY), '10');
  }
  frame(1700);
  expect(deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)?.graduateAttack?.played).toBeNull();
});
