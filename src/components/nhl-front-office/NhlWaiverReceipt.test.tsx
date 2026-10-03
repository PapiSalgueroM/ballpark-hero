import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NhlWaiverReceipt, type NhlWaiverReceiptEvent } from './NhlWaiverReceipt';

const event: NhlWaiverReceiptEvent = {
  id: 1, playerName: 'Simulated waiver player', rosterBefore: 17, rosterAfter: 16,
  capBefore: 1.2, capAfter: 3.4, deadMoneyAfter: 1.8,
};
const receipt = () => document.querySelector('[data-nhl-waiver-receipt]');

describe('NHL committed waiver receipt', () => {
  afterEach(cleanup);

  it('stays quiet without a committed event and offers no hidden controls', () => {
    render(<NhlWaiverReceipt event={null} />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(receipt()).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the exact committed roster and cap values immediately', () => {
    render(<NhlWaiverReceipt event={event} />);
    const status = screen.getByRole('status');
    expect(within(status).getByText('Last waiver')).toBeVisible();
    expect(within(status).getByText('Waived Simulated waiver player.')).toBeVisible();
    expect(status).toHaveTextContent('Roster17 → 16 players');
    expect(status).toHaveTextContent('Cap space$1.2M → $3.4M');
    expect(status).toHaveTextContent('Dead money this season$1.8M');
    expect(screen.getByRole('button', { name: 'Dismiss waiver receipt' })).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('keeps a dismissed event quiet until a new waiver arrives', () => {
    const view = render(<NhlWaiverReceipt event={event} />);
    const status = screen.getByRole('status');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss waiver receipt' }));
    expect(receipt()).toBeNull();
    expect(status).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<NhlWaiverReceipt event={{ ...event }} />);
    expect(receipt()).toBeNull();
    view.rerender(<NhlWaiverReceipt event={{ ...event, id: 2 }} />);
    expect(receipt()).not.toBeNull();
    expect(screen.getByRole('status')).toBe(status);
  });

  it('returns keyboard focus to the prior control without scrolling when dismissed', () => {
    render(<><button type="button">Keep managing</button><NhlWaiverReceipt event={event} /></>);
    const continuation = screen.getByRole('button', { name: 'Keep managing' });
    continuation.focus();
    const focus = vi.spyOn(continuation, 'focus');
    const dismiss = screen.getByRole('button', { name: 'Dismiss waiver receipt' });
    dismiss.focus();
    fireEvent.click(dismiss);
    expect(continuation).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(receipt()).toBeNull();
    focus.mockRestore();
  });

  it('preserves negative cap space and zero dead money without inventing a fee', () => {
    render(<NhlWaiverReceipt event={{ ...event, capBefore: -2.5, capAfter: -1.1, deadMoneyAfter: 0 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cap space-$2.5M → -$1.1M');
    expect(screen.getByRole('status')).toHaveTextContent('Dead money this season$0M');
    expect(screen.queryByText(/fee/i)).toBeNull();
  });

  it('retains the same event node on passive cloned props', () => {
    const view = render(<NhlWaiverReceipt event={event} />);
    const status = screen.getByRole('status'), node = receipt();
    view.rerender(<NhlWaiverReceipt event={{ ...event }} />);
    expect(screen.getByRole('status')).toBe(status);
    expect(receipt()).toBe(node);
    expect(status).toHaveTextContent('Roster17 → 16 players');
  });

  it('creates a new earned event node even when a later event has the same values', () => {
    const view = render(<NhlWaiverReceipt event={event} />);
    const status = screen.getByRole('status'), previous = receipt();
    view.rerender(<NhlWaiverReceipt event={{ ...event, id: 2 }} />);
    expect(receipt()).not.toBe(previous);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Waived Simulated waiver player.');
  });

  it('clears the receipt without replacing the live announcement region', () => {
    const view = render(<NhlWaiverReceipt event={event} />);
    const status = screen.getByRole('status');
    view.rerender(<NhlWaiverReceipt event={null} />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
    expect(receipt()).toBeNull();
  });

  it('uses finite motion with a visible static reduced-motion final state', () => {
    const css = readFileSync(process.env.NHL_WAIVER_CSS || resolve('src/components/nhl-front-office/NhlWaiverReceipt.module.css'), 'utf8')
      .replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [name, animation] of [['receipt', 'waiverEnter'], ['value', 'waiverValue']]) {
      const block = css.match(new RegExp(`\\.${name}\\s*\\{([^}]+)\\}`))?.[1];
      expect(block).toBeDefined();
      expect(block).toMatch(new RegExp(`animation:\\s*${animation}\\s+420ms\\s+ease-out\\s+1\\s*;`));
    }
    const reduced = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.receipt,\s*\.value\s*\{([^}]+)\}/)?.[1];
    expect(reduced).toBeDefined();
    expect(reduced).toMatch(/animation:\s*none\s*;/);
    expect(reduced).toMatch(/opacity:\s*1\s*;/);
    expect(reduced).toMatch(/transform:\s*none\s*;/);
  });
});
