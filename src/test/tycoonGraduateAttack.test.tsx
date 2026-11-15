import { act, cleanup, fireEvent, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import { resetMocks } from './dailyReload/mocks';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { BOOT_IDS } from '@/lib/soccerBootIds';
import { newLedger, REWARDS_KEY } from '@/lib/tycoonRewards';
import {
  AWAY_MATCHDAY_SEC, TYCOON_SAVE_KEY, bookGraduateAttack, deserializeTycoon, goalChancePerMin,
  graduateAttackFixture, newTycoon, oppChancePerMin, playAwayMatchdays, playMinute, serializeTycoon, type TycoonState,
} from '@/lib/stadiumTycoon';
import { SAVE_KEY, graduateAttackOptions, newFactory, serialize, squadEdge, type Senior } from '@/lib/wonderkidFactory';

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
  let frame: FrameRequestCallback;
  vi.spyOn(Date, 'now').mockReturnValue(time);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => { frame = next; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return (milliseconds: number) => act(() => { frame(milliseconds); });
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

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetMocks(); });

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

it.each(['watched', 'away'] as const)('holds the %s result, receipt and reward when its write is refused', mode => {
  const { booked } = nextFixture();
  playMinute(booked, () => 1, [], { pay: true }, 0.12, resolveForward);
  booked.minute = 89;
  booked.goalsFor = 1;
  const frame = fixtureClock();
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const savedAt = mode === 'away' ? now - AWAY_MATCHDAY_SEC * 1000 : now;
  const bytes = serializeTycoon(booked, savedAt);
  const ledger = JSON.stringify(newLedger(586));
  localStorage.setItem(TYCOON_SAVE_KEY, bytes);
  localStorage.setItem(REWARDS_KEY, ledger);
  refuseStadiumWrites();
  const { result } = renderHook(() => useStadiumTycoon(() => 0.12, () => [quote()]));
  if (mode === 'watched') frame(2000);
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(bytes);
  expect(localStorage.getItem(REWARDS_KEY)).toBe(ledger);
  expect(result.current.state.league?.matchday).toBe(1);
  expect(result.current.state.league?.results?.[1]).toBeUndefined();
  expect(result.current.awayTrip).toBeNull();
  expect(result.current.ticketSaveFailed).toBe(true);
});
