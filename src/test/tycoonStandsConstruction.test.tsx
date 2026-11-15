import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import {
  bookStandsConstruction, buy, capacity, catchGolden, deserializeTycoon, newTycoon,
  playAwayMatchdays, prestige, prestigeThreshold, serializeTycoon, signStadiumSponsor,
  stadiumSponsorOffers, standsConstructionQuote, tick, TRACKS, TYCOON_SAVE_KEY, upgradePurchase,
  type TycoonState,
} from '@/lib/stadiumTycoon';

const now = 1794085200000;
const reload = (state: TycoonState) => deserializeTycoon(serializeTycoon(state, now), now)!;
const finishMatch = (state: TycoonState) => tick({ ...state, minute: 89 }, 1.4, () => 1).state;
const book = (state: TycoonState) => {
  const quote = standsConstructionQuote(state)!;
  return bookStandsConstruction(state, state.rep, quote.opensAfterMatch, quote.cost);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  resetMocks();
});

describe('Stadium Tycoon scheduled Stands construction', () => {
  it('charges the quoted price once and opens seats after two watched receipts at the old capacity', () => {
    const start = { ...newTycoon(now), fanbase: 140 };
    const quote = standsConstructionQuote(start)!;
    expect(quote).toEqual({ cost: 24, opensAfterMatch: 2 });
    const pending = reload(book(start));
    expect(pending.money).toBe(16);
    expect(pending.lifetime).toBe(start.lifetime);
    expect(pending.standsOpenAfterMatch).toBe(2);
    expect(capacity(pending)).toBe(120);
    expect(bookStandsConstruction(pending, start.rep, quote.opensAfterMatch, quote.cost)).toBe(pending);
    expect(upgradePurchase({ ...pending, money: 1000 }, 'stands', 5).quantity).toBe(0);
    expect(buy({ ...pending, money: 25 }, 'tickets').levels.tickets).toBe(1);
    const first = reload(finishMatch(pending));
    expect(capacity(first)).toBe(120);
    expect(first.standsOpenAfterMatch).toBe(2);
    const opened = reload(finishMatch(first));
    expect(opened.league?.results?.map(row => row.attendance)).toEqual([120, 120]);
    expect(opened.levels.stands).toBe(1);
    expect(capacity(opened)).toBe(160);
    expect(opened.standsOpenAfterMatch).toBeUndefined();
    const third = finishMatch(opened);
    expect(third.levels.stands).toBe(1);
    expect(third.league?.results?.at(-1)?.attendance).toBe(140);
  });

  it('makes waiting cheaper with empty seats and immediate construction more profitable when sold out', () => {
    function play(state: TycoonState, matches: number) {
      const target = state.matchNo + matches;
      while (state.matchNo < target) state = tick(state, 0.25, () => 0.9999).state;
      return state;
    }
    const fresh = newTycoon(now);
    const empty = play(book(fresh), 2);
    expect(empty.money - play(buy(fresh, 'stands'), 2).money).toBeCloseTo(6);
    const soldOut = play(fresh, 8);
    const immediate = play(buy(soldOut, 'stands'), 2);
    const delayed = play(book(soldOut), 2);
    expect(immediate.lastCompletedLeague?.results?.slice(-2).map(row => row.attendance)).toEqual([146, 152]);
    expect(delayed.lastCompletedLeague?.results?.slice(-2).map(row => row.attendance)).toEqual([120, 120]);
    expect(immediate.money - delayed.money).toBeCloseTo(323.85);
    expect(capacity(immediate)).toBe(capacity(delayed));
  });

  it('uses the same settlement during away play and holds the season final for watched play', () => {
    const start = { ...newTycoon(now), fanbase: 170 };
    const away = playAwayMatchdays(book(start), 2, () => 1).state;
    const watched = finishMatch(finishMatch(book(start)));
    expect(away.league?.results).toEqual(watched.league?.results);
    expect(away.levels.stands).toBe(watched.levels.stands);
    expect(away.levels.stands).toBe(1);
    const late = playAwayMatchdays(start, 3, () => 1).state;
    const held = playAwayMatchdays(book(late), 2, () => 1);
    expect(held.results).toHaveLength(1);
    expect(held.state.standsOpenAfterMatch).toBe(5);
    expect(held.state.levels.stands).toBe(0);
    const ending = finishMatch(held.state);
    expect(ending.levels.stands).toBe(1);
    expect(ending.lastCompletedLeague?.results?.at(-1)?.attendance).toBe(120);
  });

  it('keeps signed terms while construction is pending and after opening', () => {
    const start = { ...newTycoon(now), fanbase: 170 };
    const pending = book(start);
    const signed = signStadiumSponsor(reload(pending), start.rep, start.league!.season, 'attendance');
    expect(signed.league?.sponsor).toEqual({ kind: 'attendance', target: 96, rate: 72, qualifying: 0 });
    const opened = reload(finishMatch(finishMatch(signed)));
    expect(stadiumSponsorOffers(opened, opened.league!).target).toBe(128);
    expect(opened.league?.sponsor).toEqual({ kind: 'attendance', target: 96, rate: 72, qualifying: 2 });
    const sold = prestige({ ...book(opened), lifetime: prestigeThreshold(opened) }, now);
    expect(sold.standsOpenAfterMatch).toBeUndefined();
    expect(sold.levels.stands).toBe(0);
  });

  it('quotes against the current fixture and reserves the final level from the free upgrade', () => {
    const start = newTycoon(now);
    expect(bookStandsConstruction({ ...start, money: 23 }, 0, 2, 24).money).toBe(23);
    expect(bookStandsConstruction(start, 0, 1, 24)).toBe(start);
    expect(bookStandsConstruction(start, 0, 2, 23)).toBe(start);
    expect(bookStandsConstruction(start, 1, 2, 24)).toBe(start);

    const levels = Object.fromEntries(TRACKS.map(track => [track.id, track.maxLevel]));
    levels.stands -= 1;
    levels.shop -= 1;
    const closing = { ...start, money: 1e15, levels };
    expect(catchGolden(closing, 'freeLevel').state.levels.stands).toBe(200);
    const reserved = book(closing);
    const gifted = catchGolden(reserved, 'freeLevel').state;
    expect(gifted.levels.stands).toBe(199);
    expect(gifted.levels.shop).toBe(200);
    const opened = finishMatch(finishMatch(gifted));
    expect(opened.levels.stands).toBe(200);
    expect(standsConstructionQuote(opened)).toBeNull();
    expect(reload({ ...opened, standsOpenAfterMatch: opened.matchNo + 2 }).standsOpenAfterMatch).toBeUndefined();
    expect(reload({ ...start, standsOpenAfterMatch: start.matchNo + 3 }).standsOpenAfterMatch).toBeUndefined();
  });

  it('books and resumes the paid project from the actual Upgrades panel', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    let frame: FrameRequestCallback;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
    let elapsed = 0;
    const advance = (frames: number) => act(() => {
      for (let i = 0; i < frames; i++) frame(elapsed += 2000);
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const source = serializeTycoon({ ...newTycoon(now), minute: 89, fanbase: 140 }, now);
    localStorage.setItem(TYCOON_SAVE_KEY, source);
    const nativeSet = Storage.prototype.setItem;
    let refuse = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (refuse && key === TYCOON_SAVE_KEY) throw new DOMException('Controlled write refusal', 'QuotaExceededError');
      nativeSet.call(this, key, value);
    });

    const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    expect(screen.getByText(/One Stands level opens 40 seats immediately for \$30/)).toBeVisible();
    const schedule = screen.getByRole('button', { name: 'Schedule construction for $24' });
    fireEvent.click(schedule);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save construction');
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(source);
    expect(recordCompletion).not.toHaveBeenCalled();
    refuse = false;
    fireEvent.click(schedule);
    expect(recordCompletion).toHaveBeenCalledOnce();
    expect(screen.getByText('40 seats open after 2 matches.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Stands Lv 0/ })).toBeDisabled();
    expect(deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)).toMatchObject({ money: 16, standsOpenAfterMatch: 2 });
    view.unmount();

    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    expect(screen.getByText('40 seats open after 2 matches.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Schedule construction/ })).not.toBeInTheDocument();
    expect(deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)?.money).toBe(16);
    advance(1);
    expect(screen.getByText('40 seats open after the next match.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Stands Lv 0/ })).toBeDisabled();
    advance(63);
    expect(screen.getByRole('button', { name: /Stands Lv 1/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Schedule construction for $28' })).toBeEnabled();
    const saved = deserializeTycoon(localStorage.getItem(TYCOON_SAVE_KEY), now)!;
    expect(saved.standsOpenAfterMatch).toBeUndefined();
    expect(saved.levels.stands).toBe(1);
    expect(saved.league?.results?.map(row => row.attendance)).toEqual([120, 120]);
  });
});
