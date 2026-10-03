import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GmInboxPanel } from './GmInboxPanel';
import { GM_INBOX_PACKS } from '@/data/gmInbox';
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
});
