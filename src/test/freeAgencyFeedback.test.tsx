// Fictional offers exercise the real negotiation engine and shared career panel.
import { StrictMode, useState } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
import motion from '@/components/us-career/FreeAgencyFeedback.module.css';
import { faTotalValue, pushFaOffer, type FaOffer, type FaWindow } from '@/lib/usCareerFreeAgency';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const market = (): FaWindow => ({
  note: 'Fictional free-agency window.',
  offers: [
    { team: 'fictional-current', label: 'Fictional Current', salary: 8, years: 3, quality: 75, tier: 'playoff', pitch: 'Fictional incumbent pitch.', incumbent: true, pushed: false, gone: false },
    { team: 'fictional-outside', label: 'Fictional Outside', salary: 10, years: 2, quality: 90, tier: 'contender', pitch: 'Fictional outside pitch.', incumbent: false, pushed: false, gone: false },
    { team: 'fictional-reserve', label: 'Fictional Reserve', salary: 6, years: 1, quality: 65, tier: 'rebuild', pitch: 'Fictional reserve pitch.', incumbent: false, pushed: false, gone: false },
  ],
});
const rolls = { raised: [0, 0.5, 0], held: [1, 1], withdrawn: [1, 0] } as const;
type Outcome = keyof typeof rolls;
function resolve(window: FaWindow, index: number, outcome: Outcome) {
  let step = 0;
  return pushFaOffer(window, index, { ovr: 88, age: 25, accolades: 2, cliffAge: 32, rng: () => rolls[outcome][step++] ?? 1 });
}

function mount(initial = market(), initialLine: string | null = null) {
  const controller = {
    current: clone(initial), line: initialLine, outcome: 'raised' as Outcome, accept: true,
    calls: vi.fn<(index: number) => void>(), signs: vi.fn<(index: number) => void>(),
    duringPush: () => {}, replace: (_window: FaWindow, _line: string | null = null) => {},
  };
  function Host() {
    const [window, setWindow] = useState(() => clone(initial));
    const [line, setLine] = useState(initialLine);
    controller.current = window; controller.line = line;
    controller.replace = (next, nextLine = null) => { setWindow(clone(next)); setLine(nextLine); };
    return <>
      <button>Outside focus fixture</button>
      <FreeAgencyPanel window={window} sportNoun="franchise" talkLine={line} onSign={controller.signs} onPush={index => {
        controller.calls(index); controller.duringPush();
        if (!controller.accept) return;
        const result = resolve(window, index, controller.outcome);
        setWindow(result.window); setLine(result.line);
      }} />
      {/* JSDOM does not advance the existing entrance animation to its visible final frame. */}
      <style>{'.cm-tick-in { opacity: 1; }'}</style>
    </>;
  }
  return { view: render(<StrictMode><Host /></StrictMode>), controller };
}
type Screen = ReturnType<typeof mount>;
function card(screen: Screen, index = 1) {
  return screen.view.getByText(screen.controller.current.offers[index].label, { exact: true }).closest('.rounded-2xl') as HTMLElement;
}
const ask = (screen: Screen, index = 1) => within(card(screen, index)).getByRole('button', { name: /Push for more|Talks done/ });
function assertTerms(screen: Screen, index: number, offer: FaOffer) {
  const node = card(screen, index);
  expect(within(node).getByText(`$${offer.salary}M x ${offer.years} yr${offer.years === 1 ? '' : 's'}`, { exact: true })).toBeVisible();
  expect(within(node).getByText(`$${faTotalValue(offer)}M total`, { exact: true })).toBeVisible();
  expect(within(node).getByText(`Roster ${offer.quality}`, { exact: true })).toBeVisible();
  return node;
}
function push(screen: Screen, outcome: Outcome, index = 1) {
  screen.controller.outcome = outcome;
  const button = ask(screen, index); button.focus();
  fireEvent.click(button);
  return button;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Free agency committed negotiation feedback', () => {
  it('preserves original offer order exact terms and signing indices as an independent baseline', () => {
    const original = market(), screen = mount(original), bytes = JSON.stringify(original);
    expect(screen.view.queryByRole('status')).toBeNull();
    for (let i = 0; i < original.offers.length; i++) assertTerms(screen, i, original.offers[i]);
    const labels = [...screen.view.container.querySelectorAll('p')].map(node => node.textContent).filter(text => original.offers.some(offer => text?.startsWith(offer.label)));
    expect(labels).toEqual(['Fictional CurrentYour team', 'Fictional Outside', 'Fictional Reserve']);
    fireEvent.click(within(card(screen, 2)).getByRole('button', { name: 'Sign' }));
    expect(screen.controller.signs).toHaveBeenCalledExactlyOnceWith(2); expect(screen.controller.calls).not.toHaveBeenCalled();
    expect(screen.controller.current).toEqual(original); expect(JSON.stringify(original)).toBe(bytes);
  });

  it('preserves the real one-use negotiation and exact callback index as an independent baseline', () => {
    const original = market(), expected = resolve(original, 1, 'raised'), screen = mount(original);
    const sign = within(card(screen)).getByRole('button', { name: 'Sign' });
    const button = push(screen, 'raised');
    expect(screen.controller.current).toEqual(expected.window); expect(screen.controller.line).toBe(expected.line);
    assertTerms(screen, 1, expected.window.offers[1]); expect(ask(screen)).toBe(button); expect(button).toBeDisabled();
    fireEvent.click(button); expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(1);
    expect(within(card(screen)).getByRole('button', { name: 'Sign' })).toBe(sign);
    fireEvent.click(sign); expect(screen.controller.signs).toHaveBeenCalledExactlyOnceWith(1);
    expect(original).toEqual(market());
  });

  it('announces only the raised offer with exact earned annual term and total differences', () => {
    const screen = mount(), untouched = [card(screen, 0), card(screen, 2)]; push(screen, 'raised');
    expect(screen.controller.current.offers[1]).toMatchObject({ salary: 11.3, years: 3, pushed: true, gone: false });
    const receipt = within(card(screen)).getByRole('status');
    expect(receipt).toHaveTextContent(/\+\$1\.3M/); expect(receipt).toHaveTextContent(/\+1 year/); expect(receipt).toHaveTextContent(/\+\$13\.9M/);
    expect(card(screen)).toHaveClass(motion.offer); expect(receipt).toHaveClass(motion.receipt);
    expect(screen.view.getAllByRole('status')).toEqual([receipt]);
    expect(card(screen, 0)).toBe(untouched[0]); expect(card(screen, 2)).toBe(untouched[1]);
    for (const index of [0, 2]) {
      expect(within(card(screen, index)).queryByRole('status')).toBeNull();
      expect(card(screen, index)).not.toHaveClass(motion.offer);
    }
  });

  it('announces a held engine result without claiming extra money or contract years', () => {
    const screen = mount(); push(screen, 'held');
    expect(screen.controller.current.offers[1]).toMatchObject({ salary: 10, years: 2, pushed: true, gone: false });
    const receipt = within(card(screen)).getByRole('status');
    expect(receipt).toHaveTextContent(/held|unchanged/i); expect(receipt).not.toHaveTextContent(/\+\$|\+\d+ year/);
    assertTerms(screen, 1, screen.controller.current.offers[1]); expect(ask(screen)).toBeDisabled();
  });

  it('announces a withdrawn offer and keeps other original signing options available', () => {
    const screen = mount(), node = card(screen), other = within(card(screen, 0)).getByRole('button', { name: 'Sign' });
    push(screen, 'withdrawn'); expect(card(screen)).toBe(node);
    expect(screen.controller.current.offers[1]).toMatchObject({ salary: 10, years: 2, pushed: true, gone: true });
    expect(within(node).getByRole('status')).toHaveTextContent(/withdrawn|pulled/i);
    expect(within(node).queryByRole('button')).toBeNull(); expect(other).toBeEnabled();
    fireEvent.click(other); expect(screen.controller.signs).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('keeps restored and passive resolved offers quiet without an owned push', () => {
    const restored = resolve(market(), 1, 'raised'), screen = mount(restored.window, restored.line);
    expect(screen.view.queryByRole('status')).toBeNull(); assertTerms(screen, 1, restored.window.offers[1]);
    act(() => screen.controller.replace(clone(restored.window), restored.line)); expect(screen.view.queryByRole('status')).toBeNull();
    const passive = resolve(restored.window, 2, 'held'); act(() => screen.controller.replace(passive.window, passive.line));
    expect(screen.view.queryByRole('status')).toBeNull(); assertTerms(screen, 2, passive.window.offers[2]);
  });

  it('consumes a no-op push before any matching passive offer response can arrive', () => {
    const original = market(), screen = mount(original); screen.controller.accept = false; push(screen, 'raised');
    expect(screen.view.queryByRole('status')).toBeNull(); expect(screen.controller.current).toEqual(original);
    const passive = resolve(original, 1, 'raised'); act(() => screen.controller.replace(passive.window, passive.line));
    expect(screen.view.queryByRole('status')).toBeNull(); expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('does not replay an earned receipt on prop clones or a repeated disabled Push', () => {
    const screen = mount(); push(screen, 'raised'); const receipt = within(card(screen)).getByRole('status');
    act(() => screen.controller.replace(clone(screen.controller.current), screen.controller.line));
    expect(within(card(screen)).getByRole('status')).toBe(receipt);
    fireEvent.click(ask(screen)); expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(1);
    expect(within(card(screen)).getByRole('status')).toBe(receipt);
  });

  it('clears stale negotiation feedback when a new unpushed window replaces the market', () => {
    const screen = mount(); push(screen, 'raised'); expect(within(card(screen)).getByRole('status')).toBeVisible();
    const fresh = market(); fresh.note = 'Fictional replacement window.';
    act(() => screen.controller.replace(fresh)); expect(screen.view.queryByRole('status')).toBeNull(); expect(ask(screen)).toBeEnabled();
    push(screen, 'held'); expect(within(card(screen)).getByRole('status')).toHaveTextContent(/held|unchanged/i);
  });

  it.each(['raised', 'withdrawn'] as const)('hands %s Push opener focus to its local result with preventScroll', outcome => {
    const screen = mount(), button = ask(screen), focus = vi.spyOn(HTMLElement.prototype, 'focus');
    button.focus(); focus.mockClear(); screen.controller.outcome = outcome; fireEvent.click(button);
    const receipt = within(card(screen)).getByRole('status'); expect(receipt).toHaveFocus();
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it('preserves deliberate connected outside focus while the push response commits', () => {
    const screen = mount(), outside = screen.view.getByRole('button', { name: 'Outside focus fixture' });
    screen.controller.duringPush = () => outside.focus(); push(screen, 'withdrawn');
    expect(within(card(screen)).getByRole('status')).toBeVisible(); expect(outside).toHaveFocus();
  });

  it('bounds earned feedback to one short animation and declares static reduced motion', () => {
    const css = readFileSync(process.env.FREE_AGENCY_FEEDBACK_CSS || path.resolve('src/components/us-career/FreeAgencyFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const selector of ['offer', 'receipt']) {
      const declaration = css.match(new RegExp(`\\.${selector}\\s*\\{\\s*animation:\\s*([^;]+);\\s*\\}`))?.[1];
      expect(declaration).toBeDefined();
      const duration = Number(declaration!.match(/\b(\d+(?:\.\d+)?)ms\b/)?.[1]);
      expect(duration).toBeGreaterThan(0); expect(duration).toBeLessThanOrEqual(600);
      expect(declaration).toMatch(/\s1\s*$/); expect(declaration).not.toMatch(/infinite/);
    }
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.offer,\s*\.receipt\s*\{\s*animation:\s*none;\s*\}\s*\}/);
    expect(css).not.toMatch(/display:\s*none|visibility:\s*hidden|opacity:\s*0\s*[;}]/);
  });
});
