import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon, { LatestSeasonReview } from '@/pages/StadiumTycoon';
import {
  deserializeTycoon, newTycoon, playAwayMatchdays, reserveSeasonTickets, seasonTicketQuote,
  serializeTycoon, setTicketPolicy, signStadiumSponsor, stadiumSponsorPayout, tick, ticketEconomy, TYCOON_SAVE_KEY,
  type TycoonState,
} from '@/lib/stadiumTycoon';

const now = 1794085200000;
const reload = (state: TycoonState) => deserializeTycoon(serializeTycoon(state, now), now)!;
const play = (state: TycoonState) => tick({ ...state, minute: 89 }, 1.4, () => 1).state;
const ground = (fans: number) => setTicketPolicy({ ...newTycoon(now), fanbase: fans }, 'premium');
function book(state: TycoonState) {
  return reserveSeasonTickets(state, state.rep, state.league!.season, seasonTicketQuote(state)!);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetMocks();
});

describe('Stadium Tycoon season tickets', () => {
  it('trades some gate money for more attendance when Premium leaves seats empty', () => {
    const quiet = ground(125);
    const quote = seasonTicketQuote(quiet);
    expect(quote).toEqual({ seats: 30, ticketLevel: 0 });
    const reserved = reload(book(quiet));
    expect(reserved.league?.seasonTickets).toEqual(quote);
    expect(reserved.money).toBe(quiet.money);
    expect(reserved.lifetime).toBe(quiet.lifetime);
    expect(ticketEconomy(quiet).crowd).toBe(93);
    expect(ticketEconomy(reserved).crowd).toBe(101);
    expect(ticketEconomy(reserved).gatePerSec).toBeCloseTo(5.6375);
    expect(ticketEconomy(quiet).gatePerSec).toBeCloseTo(5.8125);
    expect(ticketEconomy(reserved).growthPerSec).toBe(ticketEconomy(quiet).growthPerSec);

    const full = ground(240);
    const fullReserved = book(full);
    expect(ticketEconomy(fullReserved).crowd).toBe(ticketEconomy(full).crowd);
    expect(ticketEconomy(full).gatePerSec - ticketEconomy(fullReserved).gatePerSec).toBeCloseTo(0.675);
    const upgraded = { ...reserved, levels: { ...reserved.levels, tickets: 1 } };
    expect(ticketEconomy(upgraded).gatePerSec - ticketEconomy(reserved).gatePerSec).toBeCloseTo(71 * 0.011 * 1.25);
  });

  it('keeps a single crowd split and the original sponsor terms in watched and away reports', () => {
    const initial = ground(125);
    const signed = signStadiumSponsor(initial, initial.rep, initial.league!.season, 'attendance');
    const reserved = reload(book(signed));
    expect(reserved.league?.sponsor).toEqual(signed.league?.sponsor);
    const expected = { day: 1, gf: 0, ga: 0, attendance: 101, seasonTicketFans: 30, ticketOffer: { policy: 'premium', seats: 120 } };
    const watched = reload(play(reserved));
    const away = reload(playAwayMatchdays(reserved, 1, () => 1).state);
    expect(watched.league?.results).toEqual([expected]);
    expect(away.league?.results).toEqual([expected]);
    expect(stadiumSponsorPayout(watched.league!)).toBe(70);
    expect(stadiumSponsorPayout(away.league!)).toBe(70);
    expect(stadiumSponsorPayout(play(signed).league!)).toBe(0);

    const almost = playAwayMatchdays(watched, 100, () => 1).state;
    expect(almost.league?.matchday).toBe(4);
    const ended = reload(play(almost));
    const previous = ended.lastCompletedLeague!;
    expect(previous.seasonTickets).toEqual({ seats: 30, ticketLevel: 0 });
    expect(previous.results?.map(result => result.seasonTicketFans)).toEqual([30, 30, 30, 30, 30]);
    expect(previous.sponsor).toEqual({ ...signed.league?.sponsor, qualifying: 5 });
    expect(ended.league?.seasonTickets).toBeUndefined();
    expect(seasonTicketQuote(ended)).toBeDefined();

    render(<LatestSeasonReview last={previous} />);
    fireEvent.click(screen.getByRole('button', { name: /Latest season/ }));
    fireEvent.click(screen.getByText('Match results'));
    expect(screen.getAllByText('30 season-ticket holders · 71 walk-ups')).toHaveLength(5);
  });

  it('rejects repeat and stale choices and omits forged attendance without dropping the match', () => {
    const initial = ground(125);
    const quote = seasonTicketQuote(initial)!;
    expect(reserveSeasonTickets(initial, initial.rep + 1, 0, quote)).toBe(initial);
    expect(reserveSeasonTickets(initial, initial.rep, 1, quote)).toBe(initial);
    expect(reserveSeasonTickets(initial, initial.rep, 0, { ...quote, seats: quote.seats + 1 })).toBe(initial);
    const late = play(initial);
    expect(reserveSeasonTickets(late, initial.rep, 0, quote)).toBe(late);
    const reserved = book(initial);
    expect(reserveSeasonTickets(reserved, initial.rep, 0, quote)).toBe(reserved);

    const watched = play(reserved);
    const corrupt = structuredClone(watched);
    corrupt.league!.results![0].seasonTicketFans = 31;
    expect(reload(corrupt).league?.results).toEqual([{ day: 1, gf: 0, ga: 0, attendance: 101, ticketOffer: { policy: 'premium', seats: 120 } }]);
    const oldResult = reload(late).league!.results![0];
    expect(oldResult).toEqual({ day: 1, gf: 0, ga: 0, attendance: 93, ticketOffer: { policy: 'premium', seats: 120 } });
  });

  it('shows exact season-ticket quotes in League and retains the offer after a refused save', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const original = serializeTycoon(ground(125), now);
    localStorage.setItem(TYCOON_SAVE_KEY, original);
    const native = Storage.prototype.setItem;
    let refuse = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (refuse && key === TYCOON_SAVE_KEY) throw new DOMException('Controlled write refusal', 'QuotaExceededError');
      native.call(this, key, value);
    });

    const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    fireEvent.click(await screen.findByRole('button', { name: /League/ }));
    fireEvent.click(screen.getByText('Season tickets', { exact: true }));
    expect(screen.getByText('93 fans · $5.81 gate/sec')).toBeVisible();
    expect(screen.getByText('101 fans · $5.64 gate/sec')).toBeVisible();
    const reserve = screen.getByRole('button', { name: 'Reserve 30 season-ticket seats' });
    fireEvent.click(reserve);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save the season tickets');
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(original);
    expect(recordCompletion).not.toHaveBeenCalled();

    refuse = false;
    fireEvent.click(reserve);
    expect(screen.getByText('30 season-ticket seats reserved')).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledOnce();
    const saved = localStorage.getItem(TYCOON_SAVE_KEY)!;
    expect(deserializeTycoon(saved, now)?.league?.seasonTickets).toEqual({ seats: 30, ticketLevel: 0 });
    view.unmount();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    fireEvent.click(await screen.findByRole('button', { name: /League/ }));
    expect(screen.getByText('30 season-ticket seats reserved')).toBeVisible();
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(saved);
  });
});
