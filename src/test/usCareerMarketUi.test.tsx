import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MarketChanceWheel from '@/components/us-career/MarketChanceWheel';
import MarketCompare from '@/components/us-career/MarketCompare';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
import ExtensionCard from '@/components/us-career/ExtensionCard';
import type { MarketResult, MarketWheel } from '@/lib/usCareerMarket';
import type { FaWindow } from '@/lib/usCareerFreeAgency';
import type { ExtensionTalk } from '@/lib/usCareerExtension';
const windowOf = (): FaWindow => ({ note: 'Saved test market.', offers: [
  { team: 'AAA', label: 'Test incumbent', salary: 8, years: 3, quality: 74, tier: 'playoff', pitch: 'Saved pitch.', incumbent: true, pushed: false, gone: false },
  { team: 'BBB', label: 'Test contender', salary: 10, years: 4, quality: 90, tier: 'contender', pitch: 'Saved pitch.', incumbent: false, pushed: false, gone: false },
] });
const ext = (): ExtensionTalk => ({ team: 'AAA', label: 'Test incumbent', market: 12, offer: { salary: 10, years: 2, mood: 'fair', line: 'Saved terms.' },
  pushed: false, pulled: false, note: 'Saved opening.' });
const wheelOf = (result: MarketResult = 'held'): MarketWheel => ({ probabilities: { raised: 0.4, held: 0.3, withdrawn: 0.3 },
  result, draws: [0.9, 0.9], seen: false, label: 'Test contender', offerIndex: 1 });
const controls = () => ({ onPush: vi.fn(), onSign: vi.fn() });
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('US market presentation', () => {
  it('opening the ready wheel moves keyboard focus to its heading', () => {
    render(<MarketChanceWheel wheel={wheelOf()} onContinue={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Negotiation with Test contender' }));
  });
  it('opening comparison moves keyboard focus to its new heading', () => {
    render(<MarketCompare window={windowOf()} onBack={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Compare your saved offers' }));
  });
  it('wheel initially shows all odds and saved-result instructions without leaking the result', () => {
    const view = render(<MarketChanceWheel wheel={wheelOf('withdrawn')} onContinue={vi.fn()} />);
    expect(view.container.querySelector('[data-market-result]')?.getAttribute('data-market-result')).toBe('waiting');
    expect(screen.getByText(/already saved/)).toBeTruthy(); expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull(); expect(screen.queryByText('Offer withdrawn')).toBeNull();
  });
  it.each(['raised', 'held', 'withdrawn'] as MarketResult[])('skip reveals only the saved %s result without a draw or acknowledgment', result => {
    const w = wheelOf(result), before = structuredClone(w), onContinue = vi.fn();
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Reveal drew'); });
    const view = render(<MarketChanceWheel wheel={w} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));
    expect(view.container.querySelector('[data-market-result]')?.getAttribute('data-market-result')).toBe(result);
    expect(document.activeElement).toBe(screen.getByRole('status')); expect(onContinue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the offers' }));
    expect(onContinue).toHaveBeenCalledTimes(1); expect(w).toEqual(before); expect(random).not.toHaveBeenCalled();
  });
  it('spin finishes on the same committed result and never draws again', () => {
    vi.useFakeTimers(); const onContinue = vi.fn(), random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Spin drew'); });
    const view = render(<MarketChanceWheel wheel={wheelOf('raised')} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spin' }));
    expect(view.container.querySelector('[data-market-result]')?.getAttribute('data-market-result')).toBe('waiting');
    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.getByRole('status').textContent).toBe('Raise request accepted'); expect(random).not.toHaveBeenCalled(); expect(onContinue).not.toHaveBeenCalled();
  });
  it('reduced motion opens directly on the final result and still requires acknowledgment', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const continueFn = vi.fn(); render(<MarketChanceWheel wheel={wheelOf()} onContinue={continueFn} />);
    expect(screen.getByRole('status').textContent).toBe('Offer held'); expect(screen.queryByRole('button', { name: 'Spin' })).toBeNull(); expect(continueFn).not.toHaveBeenCalled();
  });
  it('comparison changes only ordering and preserves every saved offer and signing index', () => {
    const w = windowOf(), before = structuredClone(w), onBack = vi.fn(); const view = render(<MarketCompare window={w} onBack={onBack} />);
    const ids = () => Array.from(view.container.querySelectorAll('[data-market-compared-offer]')).map(n => n.getAttribute('data-market-compared-offer'));
    expect(ids()).toEqual(['1', '0']);
    for (const mode of ['Total value', 'Years', 'Roster']) { fireEvent.click(screen.getByRole('button', { name: mode })); expect(ids()).toEqual(['1', '0']); }
    expect(w).toEqual(before); expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to offers' })); expect(onBack).toHaveBeenCalledTimes(1);
  });
  it('comparison omits withdrawn terms and marks the selected priority', () => {
    const w = windowOf(); w.offers[1].gone = true; w.offers[1].pushed = true;
    render(<MarketCompare window={w} onBack={vi.fn()} />); expect(screen.queryByText('Test contender')).toBeNull();
    const roster = screen.getByRole('button', { name: 'Roster' }); fireEvent.click(roster); expect(roster.getAttribute('aria-pressed')).toBe('true');
  });
  it('ordinary freeagency usage keeps comparison and wheel absent by default', () => {
    const view = render(<FreeAgencyPanel window={windowOf()} sportNoun="team" talkLine={null} {...controls()} />);
    expect(view.container.querySelector('[data-fa-window]')).not.toBeNull(); expect(view.container.querySelector('[data-market-wheel]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Compare offers' })).toBeNull(); expect(view.container.querySelector('[data-market-odds]')).toBeNull();
  });
  it('freeagency comparison Back restores the remounted launcher and page position without a market action', () => {
    const handlers = controls(), w = windowOf(), before = structuredClone(w);
    render(<FreeAgencyPanel window={w} sportNoun="team" talkLine={null} {...handlers} compare />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare offers' })); expect(screen.getByRole('heading', { name: 'Compare your saved offers' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Roster' })); fireEvent.click(screen.getByRole('button', { name: 'Back to offers' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Compare offers' }));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: window.scrollY, behavior: 'auto' });
    expect(handlers.onPush).not.toHaveBeenCalled(); expect(handlers.onSign).not.toHaveBeenCalled(); expect(w).toEqual(before);
  });
  it('pending freeagency wheel hides final offers and acknowledgment returns focus to a live signing control', () => {
    const w = windowOf(); w.offers[1].pushed = true; w.offers[1].gone = true;
    const wheel = wheelOf('withdrawn'), onWheelContinue = vi.fn(), handlers = controls();
    const view = render(<FreeAgencyPanel window={w} sportNoun="team" talkLine="Saved reply" {...handlers} wheel={wheel} onWheelContinue={onWheelContinue} compare />);
    expect(view.container.querySelector('[data-fa-window]')).toBeNull(); expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' })); fireEvent.click(screen.getByRole('button', { name: 'Continue to the offers' }));
    expect(onWheelContinue).toHaveBeenCalledTimes(1);
    view.rerender(<FreeAgencyPanel window={w} sportNoun="team" talkLine="Saved reply" {...handlers} wheel={{ ...wheel, seen: true }} onWheelContinue={onWheelContinue} compare />);
    expect(document.activeElement).toBe(view.container.querySelector('[data-fa-sign="0"]'));
    expect(handlers.onSign).not.toHaveBeenCalled(); expect(handlers.onPush).not.toHaveBeenCalled();
  });
  it('pending extension wheel hides final terms and a pulled result returns to the real decline path', () => {
    const t = ext(); t.offer = null; t.pushed = true; t.pulled = true;
    const w = { ...wheelOf('withdrawn'), label: t.label, offerIndex: null }, onWheelContinue = vi.fn(), onDecline = vi.fn();
    const view = render(<ExtensionCard talk={t} seasonWord="season" {...controls()} onDecline={onDecline} wheel={w} onWheelContinue={onWheelContinue} />);
    expect(view.container.querySelector('[data-extension-talk]')).toBeNull(); expect(screen.queryByRole('button', { name: 'Play the year out' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' })); fireEvent.click(screen.getByRole('button', { name: 'Continue to the offers' }));
    view.rerender(<ExtensionCard talk={t} seasonWord="season" {...controls()} onDecline={onDecline} wheel={{ ...w, seen: true }} onWheelContinue={onWheelContinue} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play the year out' })); expect(onDecline).not.toHaveBeenCalled();
  });
  it('freeagency presents all exact pre-push odds including zero withdrawal for the incumbent', () => {
    const odds = [{ raised: 0.4, held: 0.6, withdrawn: 0 }, { raised: 0.4, held: 0.3, withdrawn: 0.3 }];
    const view = render(<FreeAgencyPanel window={windowOf()} sportNoun="team" talkLine={null} {...controls()} compare odds={odds} />);
    expect(within(view.container.querySelector('[data-market-odds="0"]') as HTMLElement).getByText('Withdrawn 0%')).toBeTruthy();
    expect(view.container.querySelector('[data-market-odds="1"] [data-market-chance="raised"]')?.getAttribute('data-probability')).toBe('0.4');
    expect(screen.getByText(/30 of 100 equal parts/)).toBeTruthy();
  });
  it('extension presents all pre-push odds but does not offer another prediction after a spent push', () => {
    const t = ext(), odds = { raised: 0, held: 0.7, withdrawn: 0.3 };
    const view = render(<ExtensionCard talk={t} seasonWord="season" {...controls()} onDecline={vi.fn()} odds={odds} onWheelContinue={vi.fn()} />);
    expect(screen.getByText('Withdrawn 30%')).toBeTruthy(); expect(screen.getByText(/30 of 100 equal parts/)).toBeTruthy();
    view.rerender(<ExtensionCard talk={{ ...t, pushed: true }} seasonWord="season" {...controls()} onDecline={vi.fn()} odds={odds} />);
    expect(view.container.querySelector('[data-market-odds]')).toBeNull();
  });
  it('enhanced extension actions have explicit 44px targets', () => {
    const view = render(<ExtensionCard talk={ext()} seasonWord="season" {...controls()} onDecline={vi.fn()} onWheelContinue={vi.fn()} />);
    for (const button of view.container.querySelectorAll('button')) expect(button.classList.contains('min-h-11')).toBe(true);
  });
});
