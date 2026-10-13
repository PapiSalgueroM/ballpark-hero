import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GmInboxPanel } from './GmInboxPanel';
import { GM_INBOX_PACKS } from '@/data/gmInbox';
import { gmExpiredLine } from '@/lib/gmInbox';
import type { InboxMessage } from '@/lib/careerInbox';

const pack = GM_INBOX_PACKS.nfl;
const def = pack.events.find(e => e.id === 'nfl_play_through')!;
const msg = (id: string, answered?: number): InboxMessage => ({
  id, defId: def.id, from: def.from, emoji: def.emoji, text: def.text, year: 2026, choices: def.choices, beat: def.beat,
  ...(answered === undefined ? {} : { answered }),
});

describe('GmInboxPanel', () => {
  it('shows newest first, the beat line, and every option with what it moves', () => {
    const onAnswer = vi.fn();
    render(<GmInboxPanel pack={pack} messages={[msg('old', 0), msg('new')]} onAnswer={onAnswer} seen={new Set()} />);
    const rows = document.querySelectorAll('[data-inbox-row]');
    expect([...rows].map(r => r.getAttribute('data-inbox-row'))).toEqual(['new', 'old']);
    expect(screen.getByText('1 waiting on you.', { exact: false })).toBeTruthy();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Regular season, 2026', { exact: false })).toBeTruthy();
    const sit = screen.getByText('Sit him · Owner trust +1, Your franchise player out 2 weeks');
    expect(screen.getByText('Play him · Owner trust -1, Fans +2, Your franchise player rating -2')).toBeTruthy();
    fireEvent.click(sit);
    expect(onAnswer).toHaveBeenCalledWith('new', 0);
  });

  it('an empty desk says so in desk words', () => {
    render(<GmInboxPanel pack={pack} messages={[]} onAnswer={() => undefined} seen={new Set()} />);
    expect(screen.getByText('Nothing on your desk yet.', { exact: false })).toBeTruthy();
  });

  it('says when the desk is full', () => {
    render(<GmInboxPanel pack={pack} messages={[msg('a'), msg('b'), msg('c')]} onAnswer={() => undefined} seen={new Set()} />);
    expect(screen.getByText('Nothing new lands until you answer one.', { exact: false })).toBeTruthy();
  });

  /* Round 1332: the panel half Round 1324 left (its closing check, finding 1). */
  const REPLY_BOX = 'rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground';

  it('an opened card the staff settled shows the settled line, never "You replied"', () => {
    const settled = { ...msg('s', 0), auto: true } as InboxMessage;
    render(<GmInboxPanel pack={pack} messages={[settled]} onAnswer={() => undefined} seen={new Set()} />);
    fireEvent.click(document.querySelector('[data-inbox-row="s"]')!);
    const box = document.querySelector('[data-inbox-settled]');
    expect(box).toBeTruthy();
    expect(box!.textContent).toBe(gmExpiredLine(settled));
    expect(box!.textContent).toContain(`(${def.choices[0].label})`);
    expect(box!.textContent).not.toContain('Owner trust');
    expect(box!.className).toBe(REPLY_BOX);
    expect(screen.queryByText('You replied', { exact: false })).toBeNull();
  });

  it('a card the manager answered himself still reads "You replied"', () => {
    render(<GmInboxPanel pack={pack} messages={[msg('m', 0)]} onAnswer={() => undefined} seen={new Set()} />);
    fireEvent.click(document.querySelector('[data-inbox-row="m"]')!);
    expect(document.querySelector('[data-inbox-settled]')).toBeNull();
    const reply = screen.getByText('You replied', { exact: false });
    expect(reply.className).toBe(REPLY_BOX);
    expect(reply.textContent).toBe('You replied: Sit him · Owner trust +1, Your franchise player out 2 weeks');
  });

  it('a full desk with nothing that can expire says only that he must answer one', () => {
    render(<GmInboxPanel pack={pack} messages={[msg('a'), msg('b'), msg('c')]} onAnswer={() => undefined} seen={new Set()} />);
    const line = document.querySelector('[data-gm-inbox] > p')!.textContent!;
    expect(line).toContain(' Nothing new lands until you answer one.');
    expect(line).not.toContain('your assistant');
  });

  it('a full desk holding a card that can expire says the assistant may deal with one', () => {
    const expiring = { ...pack, events: pack.events.map(e => (e.id === def.id ? { ...e, expires: 2 } : e)) };
    render(<GmInboxPanel pack={expiring} messages={[msg('a'), msg('b'), msg('c')]} onAnswer={() => undefined} seen={new Set()} />);
    const line = document.querySelector('[data-gm-inbox] > p')!.textContent!;
    expect(line).toContain(' Nothing new lands until you answer one, or your assistant deals with one for you.');
    expect(line.split('Nothing new lands').length).toBe(2);
  });
});
