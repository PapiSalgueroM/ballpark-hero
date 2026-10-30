/**
 * Round 1561 (fix, the review's finding 7): unit cases for the three shared pieces both Front Office boards play the
 * GM career on, which the boards' own suites held only through a whole board.
 *
 *   careerBindingOf (careerBinding.ts)
 *     1  before the kit: his record is the save alone's (hostBoxLegacy), the market is not read, and the two things
 *        only a screen behind a box reads (the seat pack, the earn line) throw when read;
 *     2  with the kit: his record is the kit's legacy, never the save alone's (the review's bindlegacy mutant), the
 *        pack and the earn line are the kit's, and the market is read only while he is between seats.
 *   useGmCareerKit (useGmCareerKit.ts)
 *     3  a season being played never asks; the last period asks and its press waits only there (the review's
 *        hookwaits mutant); a recap asks; a failed fetch says so and a retry asks again; a kit already here is used.
 *   GmCareerKitHolding (GmCareerKitHolding.tsx)
 *     4  the holding box at its floor, and a failed fetch's card whose Try again calls the retry.
 *
 * Nothing here reads the network, a clock or the database; the kit is a stub handed in.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, renderHook, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { careerBindingOf, type CareerBindingFacts, type CareerBindingKit } from '@/components/front-office-shared/careerBinding';
import { useGmCareerKit } from '@/components/front-office-shared/useGmCareerKit';
import { GmCareerKitHolding } from '@/components/front-office-shared/GmCareerKitHolding';
import { makeCareerKitLoader, type CareerKitMoment } from '@/components/front-office-shared/careerKitLoader';
import { hostBoxLegacy, hostSeatOf, type HostLegacy } from '@/lib/gmCareerFace';
import { freshGmDesk } from '@/lib/gmDesk';

vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

afterEach(() => { cleanup(); });

/* eslint-disable @typescript-eslint/no-explicit-any */
const BOX = { team: 'DET', season: 2027, seasonCounted: true, seasonsPlayed: 3, titles: 1, fired: true };

function factsOf(over: Partial<CareerBindingFacts> = {}): CareerBindingFacts {
  return {
    desk: null, fired: BOX.fired, nameOf: id => `club ${id}`, box: BOX, live: ['ownership', 'media'], sources: ['wins', 'titles'],
    take: vi.fn(), sitOut: vi.fn(), spend: vi.fn(), ...over,
  };
}

/** A kit whose legacy record is not the save alone's: another tier and a last grade, which only the league knows. */
function kitOf(): CareerBindingKit<{ id: string }> & { hostMarket: any; hostEarnsLine: any } {
  const legacy: HostLegacy = { ...hostBoxLegacy(BOX), tier: 2, lastGrade: 'met' };
  return {
    host: { pack: { id: 'the pack' } } as any,
    league: { id: 'the league' },
    legacy,
    hostMarket: vi.fn(() => ({ state: 'open', stub: true })) as any,
    hostEarnsLine: vi.fn(() => 'the earn line') as any,
  };
}

describe('careerBindingOf: the career half of a board, before the kit and with it', () => {
  it('1 before the kit: the record is the save alone, no market, and the pack and the earn line throw when read', () => {
    for (const desk of [null, freshGmDesk()]) {
      const f = factsOf({ desk });
      const b = careerBindingOf(f, null);
      expect(JSON.stringify(b.seat)).toBe(JSON.stringify(hostSeatOf(desk, hostBoxLegacy(BOX))));
      expect(b.market, 'the market is the kit\'s to read').toBeNull();
      expect(b.deskOn).toBe(desk !== null);
      expect(b.live).toEqual(['ownership', 'media']);
      expect(() => b.pack, 'the seat pack read before the kit').toThrow('the career kit was read before it arrived');
      expect(() => b.earns, 'the earn line read before the kit').toThrow('the career kit was read before it arrived');
      b.take({ teamId: 'BOS' } as any); b.sitOut(); b.spend('ownership');
      expect([f.take, f.sitOut, f.spend].map(fn => (fn as any).mock.calls.length)).toEqual([1, 1, 1]);
    }
  });

  it("2 with the kit: the record is the kit's legacy, the pack and the earn line are the kit's, the market only when out of work", () => {
    for (const desk of [null, freshGmDesk()]) {
      const kit = kitOf();
      const b = careerBindingOf(factsOf({ desk }), kit);
      const theirs = JSON.stringify(hostSeatOf(desk, kit.legacy));
      expect(JSON.stringify(b.seat), "his record is the kit's legacy").toBe(theirs);
      expect(theirs, 'vacuity: the kit record differs from the save alone').not.toBe(JSON.stringify(hostSeatOf(desk, hostBoxLegacy(BOX))));
      expect(b.pack).toBe(kit.host.pack);
      expect(b.earns).toBe('the earn line');
      expect(kit.hostEarnsLine).toHaveBeenCalledWith(['wins', 'titles']);
      expect(b.market).toEqual({ state: 'open', stub: true });
      expect(kit.hostMarket).toHaveBeenCalledTimes(1);
      expect(kit.hostMarket.mock.calls[0].slice(0, 3)).toEqual([kit.host, kit.league, b.seat]);
      const seated = kitOf();
      const s = careerBindingOf(factsOf({ desk, fired: false }), seated);
      expect(s.market, 'a man in a seat has no market').toBeNull();
      expect(seated.hostMarket, 'the market is not even read in a seat').not.toHaveBeenCalled();
    }
  });
});

/** A loader over a stub import the case resolves or fails by hand, counting how often it is asked. */
function stubLoader() {
  const asks: { resolve: (k: { kit: number }) => void; reject: (e: Error) => void }[] = [];
  const loader = makeCareerKitLoader(() => new Promise<{ kit: number }>((resolve, reject) => { asks.push({ resolve, reject }); }));
  return { loader, asks };
}
const moment = (over: Partial<CareerKitMoment> = {}): CareerKitMoment => ({ phase: 'hub', presser: false, boxOpen: false, lastPeriod: false, ...over });
const LANDING = { phase: 'hub', landedAt: null };

describe('useGmCareerKit: the kit asked for when a screen needs it, the last press waiting for it', () => {
  it('3a a season being played never asks for it and its press never waits', async () => {
    const { loader, asks } = stubLoader();
    const { result } = renderHook(() => useGmCareerKit(loader, moment(), LANDING));
    await act(async () => { await Promise.resolve(); });
    expect(asks.length, 'a round in the middle of the season asked for the kit').toBe(0);
    expect(result.current.waits, 'a round in the middle of the season waits for the kit').toBe(false);
    expect(result.current.kit).toBeNull();
  });

  it('3b the last period asks for it, its press waits until it is here, then plays', async () => {
    const { loader, asks } = stubLoader();
    const { result } = renderHook(() => useGmCareerKit(loader, moment({ lastPeriod: true }), LANDING));
    expect(asks.length).toBe(1);
    expect(result.current.waits, 'the last press does not wait for the kit').toBe(true);
    await act(async () => { asks[0].resolve({ kit: 1 }); });
    expect(result.current.kit).toEqual({ kit: 1 });
    expect(result.current.waits).toBe(false);
  });

  it('3c a recap, a presser and an open box each ask, and none of them makes a press wait off the hub', async () => {
    for (const m of [moment({ phase: 'recap' }), moment({ presser: true }), moment({ boxOpen: true }), moment({ phase: 'fired', lastPeriod: true })]) {
      const { loader, asks } = stubLoader();
      const { result, unmount } = renderHook(() => useGmCareerKit(loader, m, LANDING));
      expect(asks.length, `${JSON.stringify(m)} did not ask`).toBe(1);
      expect(result.current.waits).toBe(m.phase === 'hub' && m.lastPeriod);
      unmount();
    }
  });

  it('3d a failed fetch says so, and a retry asks again and lands the kit', async () => {
    const { loader, asks } = stubLoader();
    const { result } = renderHook(() => useGmCareerKit(loader, moment({ boxOpen: true }), LANDING));
    await act(async () => { asks[0].reject(new Error('offline')); });
    expect(result.current.failed).toBe(true);
    expect(result.current.kit).toBeNull();
    act(() => { result.current.retry(); });
    await waitFor(() => expect(asks.length).toBe(2));
    expect(result.current.failed).toBe(false);
    await act(async () => { asks[1].resolve({ kit: 2 }); });
    expect(result.current.kit).toEqual({ kit: 2 });
  });

  it('3e a kit already on the page is used at once: nothing asked, no press waits', async () => {
    const { loader, asks } = stubLoader();
    const first = loader.load();
    asks[0].resolve({ kit: 3 });
    await first;
    const { result } = renderHook(() => useGmCareerKit(loader, moment({ lastPeriod: true }), LANDING));
    expect(result.current.kit).toEqual({ kit: 3 });
    expect(result.current.waits).toBe(false);
    expect(asks.length).toBe(1);
  });
});

describe('GmCareerKitHolding: the box a career screen holds while the kit is on its way', () => {
  it('4 the holding box stands at its floor; a failed fetch says so and Try again retries', () => {
    const retry = vi.fn();
    const { rerender } = render(<GmCareerKitHolding failed={false} onRetry={retry} minHeight={255} />);
    const hold = document.querySelector('[data-gm-panel-loading]') as HTMLElement;
    expect(hold, 'no holding box').not.toBeNull();
    expect(hold.style.minHeight).toBe('255px');
    expect(document.querySelector('[data-career-kit-failed]')).toBeNull();
    rerender(<GmCareerKitHolding failed onRetry={retry} minHeight={184} />);
    const card = document.querySelector('[data-career-kit-failed]') as HTMLElement;
    expect(card, 'no failed card').not.toBeNull();
    expect(card.style.minHeight).toBe('184px');
    fireEvent.click(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
