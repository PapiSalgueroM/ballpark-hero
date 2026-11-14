import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon, { LatestSeasonReview } from '@/pages/StadiumTycoon';
import {
  attendance, deserializeTycoon, leagueShape, newTycoon, playAwayMatchdays, prestige,
  serializeTycoon, setTicketPolicy, signStadiumSponsor, stadiumSponsorOffers, stadiumSponsorPayout,
  tick, TYCOON_SAVE_KEY, type StadiumSponsor, type TycoonState,
} from '@/lib/stadiumTycoon';

const now = 1794085200000;
const nextMatch = (state: TycoonState) => tick({ ...state, minute: 89, goalsFor: 3, goalsAgainst: 0 }, 1.5, () => 1).state;
const reload = (state: TycoonState) => deserializeTycoon(serializeTycoon(state, now), now)!;
const sign = (state: TycoonState, kind: StadiumSponsor) => signStadiumSponsor(state, state.rep, state.league!.season, kind);

function finish(state: TycoonState) {
  const days = leagueShape(state.league!.division).matchdays;
  for (let day = state.league!.matchday; day < days; day++) state = reload(nextMatch(state));
  return state;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetMocks();
});

describe('Stadium Tycoon season sponsors', () => {
  it.each([['sparse', 35, 0], ['full', 170, 5]] as const)('balances fixed vs crowd fees in the %s ground', (_label, fans, qualifying) => {
    const start = { ...newTycoon(now), fanbase: fans };
    const { fixed, rate, target } = stadiumSponsorOffers(start, start.league!);
    const baseline = finish(start);
    const fixedDeal = finish(reload(sign(start, 'fixed')));
    const crowdDeal = finish(reload(sign(start, 'attendance')));
    expect(fixed).toBe(3 * rate);
    expect(fixedDeal.money - baseline.money).toBeCloseTo(fixed);
    expect(crowdDeal.money - baseline.money).toBeCloseTo(rate * qualifying);
    expect(crowdDeal.lifetime - baseline.lifetime).toBeCloseTo(rate * qualifying);
    expect(qualifying === 0 ? fixedDeal.money > crowdDeal.money : fixedDeal.money < crowdDeal.money).toBe(true);
    expect(crowdDeal.lastCompletedLeague?.sponsor).toEqual({ kind: 'attendance', qualifying, target, rate });
    expect(crowdDeal.lastCompletedLeague?.clubs).toEqual(baseline.lastCompletedLeague?.clubs);
    expect(crowdDeal.lastCompletedLeague?.results).toEqual(baseline.lastCompletedLeague?.results);
    expect(crowdDeal.league?.division).toBe(1);
    expect(crowdDeal.league?.sponsor).toBeUndefined();
    expect(prestige({ ...crowdDeal, lifetime: 4_000_000 }, now).lastCompletedLeague).toBeUndefined();
    expect(baseline.lastCompletedLeague?.sponsor).toBeUndefined();
  });

  it('uses the full-time crowd for both watched and away league matchdays', () => {
    const start = { ...newTycoon(now), fanbase: 120 };
    const signed = sign(start, 'attendance');
    const premium = setTicketPolicy(signed, 'premium');
    expect(attendance(signed)).toBe(120);
    expect(attendance(premium)).toBe(90);
    const first = nextMatch(premium);
    expect(first.fanbase).toBeGreaterThan(premium.fanbase);
    expect(attendance(first)).toBeGreaterThanOrEqual(96);
    expect(first.league?.sponsor?.qualifying).toBe(0);
    const ready = setTicketPolicy(reload(first), 'standard');
    const played = playAwayMatchdays(ready, 30, () => 1);
    expect(played.results).toHaveLength(3);
    expect(played.state.league?.sponsor?.qualifying).toBe(3);
    expect(played.state.money).toBe(ready.money);
    expect(played.state.lastCompletedLeague).toBeUndefined();
    const final = nextMatch(reload(played.state));
    expect(final.lastCompletedLeague?.sponsor?.qualifying).toBe(4);
    expect(final.league?.sponsor).toBeUndefined();
    const ordinary = nextMatch(reload(final));
    expect(ordinary.lastCompletedLeague).toEqual(final.lastCompletedLeague);
    expect(ordinary.league?.sponsor).toBeUndefined();
  });

  it('rejects a second deal, a stale ground or season, and forged counts on reload', () => {
    const start = newTycoon(now);
    const signed = sign(start, 'attendance');
    expect(sign(signed, 'fixed')).toBe(signed);
    expect(signStadiumSponsor(start, start.rep + 1, 0, 'fixed')).toBe(start);
    expect(signStadiumSponsor(start, start.rep, 1, 'fixed')).toBe(start);
    const late = nextMatch(start);
    expect(sign(late, 'fixed')).toBe(late);
    const broken = structuredClone(signed);
    broken.league!.sponsor!.qualifying = 9;
    expect(reload(broken).league).toEqual(start.league);
  });

  it('reads the actual crowd payout after promotion and reload', () => {
    const result = finish(sign({ ...newTycoon(now), fanbase: 220 }, 'attendance'));
    const last = result.lastCompletedLeague!;
    render(<LatestSeasonReview last={last} />);
    fireEvent.click(screen.getByRole('button', { name: /Latest season/ }));
    expect(screen.getByText('Touchline Tonic paid $360')).toBeVisible();
    expect(stadiumSponsorPayout(last)).toBe(360);
    expect(screen.getByText('5 of 5 matchdays drew at least 96 fans.')).toBeVisible();
  });

  it('only signs once its save succeeds and opens on the saved deal', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const source = serializeTycoon(newTycoon(now), now);
    localStorage.setItem(TYCOON_SAVE_KEY, source);
    const nativeSet = Storage.prototype.setItem;
    let refuse = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (refuse && key === TYCOON_SAVE_KEY) throw new DOMException('Controlled write refusal', 'QuotaExceededError');
      nativeSet.call(this, key, value);
    });
    const openLeague = async () => fireEvent.click(await screen.findByRole('button', { name: /League/ }));
    const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openLeague();
    fireEvent.click(screen.getByText('Season sponsorship'));
    fireEvent.click(screen.getByRole('button', { name: /Touchline Tonic/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save the deal');
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(source);
    expect(recordCompletion).not.toHaveBeenCalled();
    refuse = false;
    fireEvent.click(screen.getByRole('button', { name: /Touchline Tonic/ }));
    expect(recordCompletion).toHaveBeenCalledOnce();
    expect(screen.getByText(/Touchline Tonic ·/)).toBeVisible();
    const signed = localStorage.getItem(TYCOON_SAVE_KEY)!;
    expect(deserializeTycoon(signed, now)?.league?.sponsor?.kind).toBe('attendance');
    view.unmount();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openLeague();
    expect(screen.getByText(/Touchline Tonic ·/)).toBeVisible();
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(signed);
  });
});
