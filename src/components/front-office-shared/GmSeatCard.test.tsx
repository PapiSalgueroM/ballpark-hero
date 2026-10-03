import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import GmSeatCard from './GmSeatCard';
import {
  newGmCareer, recordSeatSeason, endSeatStint, seatOffers, seatExitLine, poachBid, takeSeat,
  startSeatStint, sitOutYear, seatMandate, type SeatTeam,
} from '@/lib/gmSeat';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';

afterEach(cleanup);

const seeded = (s: number) => {
  let x = (s >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
};
const teams: SeatTeam[] = Array.from({ length: 30 }, (_, i) => ({ id: `T${i}`, name: `Club ${i}`, strength: 100 - i }));

describe('GmSeatCard', () => {
  it('shows the ask in the seat words while you hold the seat', () => {
    const pack = GM_SEAT_PACKS.cfb;
    render(<GmSeatCard pack={pack} mandate={seatMandate(pack, 12, 30, false, 2026)} trust={60} />);
    expect(screen.getByText(/The athletic director and the boosters/)).toBeTruthy();
    expect(screen.getByText(/Make the Playoff/)).toBeTruthy();
    expect(screen.getByText('Trust 60')).toBeTruthy();
  });

  it('Take the job hands back the offer, and takeSeat puts you in that seat', () => {
    const pack = GM_SEAT_PACKS.nba;
    let c = newGmCareer('T0', 1, 2026);
    c = endSeatStint(recordSeatSeason(c, 'title'), 'walked');
    const offers = seatOffers(pack, teams, c, 2027, seeded(9));
    expect(offers.length).toBeGreaterThan(0);
    const onTake = vi.fn();
    render(<GmSeatCard pack={pack} mandate={null} trust={0}
      market={{ line: seatExitLine(pack, c, offers.length), offers, seasonsOut: 0 }} onTake={onTake} onSitOut={() => {}} />);
    /* A champion who walked is told he walked, never that he was pushed. */
    expect(screen.getByText(/You walked away on your own terms/)).toBeTruthy();
    expect(screen.queryByText(/made the call/)).toBeNull();
    fireEvent.click(screen.getAllByText('Take the job')[0]);
    expect(onTake).toHaveBeenCalledWith(offers[0]);
    const save = { league: { season: 2027 }, myTeam: 'T0', trust: 0, fired: true, mandate: null };
    const next = takeSeat(save, onTake.mock.calls[0][0]);
    expect(next.myTeam).toBe(offers[0].teamId);
    expect(next.league).toBe(save.league);
    expect(startSeatStint(c, offers[0], 2027).stints[1].team).toBe(offers[0].teamId);
  });

  it('says so when nobody calls, and Sit the year out reports the choice', () => {
    const pack = GM_SEAT_PACKS.afl;
    const c = endSeatStint(recordSeatSeason(newGmCareer('T5', 4, 2026), 'badly'), 'fired');
    const onSitOut = vi.fn();
    render(<GmSeatCard pack={pack} mandate={null} trust={0}
      market={{ line: seatExitLine(pack, c, 0), offers: [], seasonsOut: 1 }} onSitOut={onSitOut} />);
    expect(screen.getByText('No club is calling right now.')).toBeTruthy();
    expect(screen.getByText(/Nobody has called yet/)).toBeTruthy();
    fireEvent.click(screen.getByText('Sit the year out'));
    expect(onSitOut).toHaveBeenCalledTimes(1);
    expect(sitOutYear(c).seasonsOut).toBe(1);
  });

  it('shows a buyout bid only a college seat can make', () => {
    const big = recordSeatSeason(newGmCareer('T20', 3, 2026), 'title');
    let bid = null;
    for (let s = 1; s < 50 && !bid; s++) bid = poachBid(GM_SEAT_PACKS.cbb, teams, big, 2027, seeded(s));
    expect(bid).not.toBeNull();
    const onTake = vi.fn(); const onStay = vi.fn();
    render(<GmSeatCard pack={GM_SEAT_PACKS.cbb} mandate={seatMandate(GM_SEAT_PACKS.cbb, 20, 30, true, 2027)} trust={100}
      bid={bid} onTake={onTake} onStay={onStay} />);
    fireEvent.click(screen.getByText(`Go to ${bid!.teamName}`));
    expect(onTake).toHaveBeenCalledWith(bid);
    fireEvent.click(screen.getByText('Stay put'));
    expect(onStay).toHaveBeenCalledTimes(1);
    for (let s = 1; s < 50; s++) expect(poachBid(GM_SEAT_PACKS.nfl, teams, big, 2027, seeded(s))).toBeNull();
  });
});
