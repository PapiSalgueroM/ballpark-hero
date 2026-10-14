/* Round 1332: the US careers' inbox panel draws exactly as before without the
   new settledLine prop, and with it an answered card can say who settled it. */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InboxPanel } from './InboxPanel';
import type { InboxMessage } from '@/lib/careerInbox';

const REPLY_BOX = 'rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground';
const choices = [
  { label: 'Take the call', reply: 'On it.', karma: 2 },
  { label: 'Let it ring', reply: 'Later.', karma: -1 },
];
const text = (id: string, answered?: number): InboxMessage => ({
  id, defId: `def_${id}`, from: 'Your agent', emoji: '📱', text: `A ${id} offer came in.`, year: 2027, choices,
  ...(answered === undefined ? {} : { answered }),
});

describe('InboxPanel', () => {
  it('without settledLine: the list, the buttons and "You replied" as before', () => {
    const onAnswer = vi.fn();
    render(<InboxPanel messages={[text('open'), text('done', 1)]} onAnswer={onAnswer} seen={new Set()} />);
    const rows = [...document.querySelectorAll('[data-inbox-row]')].map(r => r.getAttribute('data-inbox-row'));
    expect(rows).toEqual(['open', 'done']);
    fireEvent.click(document.querySelector('[data-inbox-row="done"]')!);
    const reply = screen.getByText('You replied', { exact: false });
    expect(reply.textContent).toBe('You replied: Let it ring');
    expect(reply.className).toBe(REPLY_BOX);
    expect(document.querySelector('[data-inbox-settled]')).toBeNull();
    fireEvent.click(screen.getByText('← Back to inbox'));
    fireEvent.click(document.querySelector('[data-inbox-row="open"]')!);
    expect(screen.getByText('Let it ring').tagName).toBe('BUTTON');
    fireEvent.click(screen.getByText('Take the call'));
    expect(onAnswer).toHaveBeenCalledWith('open', 0);
  });

  it('with settledLine: its line in the reply box, and no "You replied"', () => {
    const settledLine = (m: InboxMessage) => (m.id === 'auto' ? 'Your assistant dealt with it (Let it ring).' : null);
    render(<InboxPanel messages={[text('auto', 1), text('mine', 0)]} onAnswer={() => undefined} seen={new Set()} settledLine={settledLine} />);
    fireEvent.click(document.querySelector('[data-inbox-row="auto"]')!);
    const box = document.querySelector('[data-inbox-settled]')!;
    expect(box.textContent).toBe('Your assistant dealt with it (Let it ring).');
    expect(box.className).toBe(REPLY_BOX);
    expect(screen.queryByText('You replied', { exact: false })).toBeNull();
    fireEvent.click(screen.getByText('← Back to inbox'));
    /* A card the line returns null for is the player's own reply. */
    fireEvent.click(document.querySelector('[data-inbox-row="mine"]')!);
    expect(document.querySelector('[data-inbox-settled]')).toBeNull();
    expect(screen.getByText('You replied', { exact: false }).textContent).toBe('You replied: Take the call');
  });

  it('settledLine is never asked about an open card: its buttons stay', () => {
    const settledLine = vi.fn(() => 'never shown');
    render(<InboxPanel messages={[text('open')]} onAnswer={() => undefined} seen={new Set()} settledLine={settledLine} />);
    fireEvent.click(document.querySelector('[data-inbox-row="open"]')!);
    expect(settledLine).not.toHaveBeenCalled();
    expect(screen.getByText('Take the call').tagName).toBe('BUTTON');
    expect(screen.queryByText('never shown')).toBeNull();
  });
});
