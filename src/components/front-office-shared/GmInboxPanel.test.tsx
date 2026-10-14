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

  /* An expiring card as gmPackProblems wants it (an option that moves
     nothing), and a card dealt from it, which carries its arrival tick w. */
  const expDef = { ...def, expires: 2, choices: [...def.choices, { label: 'Leave it with the staff', reply: 'Left.', karma: 0 }] };
  const expiring = { ...pack, events: pack.events.map(e => (e.id === def.id ? expDef : e)) };
  const dealt = (id: string, answered?: number) => ({ ...msg(id, answered), choices: expDef.choices, w: 3 }) as InboxMessage;
  const fullLine = () => document.querySelector('[data-gm-inbox] > p')!.textContent!;

  it('a full desk holding a card that can expire says the assistant may deal with one', () => {
    render(<GmInboxPanel pack={expiring} messages={[dealt('a'), dealt('b'), dealt('c')]} onAnswer={() => undefined} seen={new Set()} />);
    const line = fullLine();
    expect(line).toContain(' Nothing new lands until you answer one, or your assistant deals with one for you.');
    expect(line.split('Nothing new lands').length).toBe(2);
  });

  it('a full desk whose only expiring card is answered says only that he must answer one', () => {
    const other = pack.events.find(e => e.id !== def.id && e.expires === undefined)!;
    const plain = (id: string) => ({ id, defId: other.id, from: other.from, emoji: other.emoji, text: other.text, year: 2026, choices: other.choices, beat: other.beat }) as InboxMessage;
    render(<GmInboxPanel pack={expiring} messages={[dealt('x', 2), plain('a'), plain('b'), plain('c')]} onAnswer={() => undefined} seen={new Set()} />);
    const line = fullLine();
    expect(line).toContain('3 waiting on you.');
    expect(line).toContain(' Nothing new lands until you answer one.');
    expect(line).not.toContain('your assistant');
  });

  it('a card dealt before its card could expire (no w) is never settled, so the line does not promise the assistant', () => {
    const undated = (id: string) => ({ ...msg(id), choices: expDef.choices }) as InboxMessage;
    render(<GmInboxPanel pack={expiring} messages={[undated('a'), undated('b'), undated('c')]} onAnswer={() => undefined} seen={new Set()} />);
    const line = fullLine();
    expect(line).toContain(' Nothing new lands until you answer one.');
    expect(line).not.toContain('your assistant');
  });

  it('an option with a registered effect prints it in the registry words handed in as fx', () => {
    const fxChoices = [{ ...def.choices[0], fx: { board: 2 } }, ...def.choices.slice(1)];
    const m = { ...msg('f'), choices: fxChoices };
    const fx = { board: { label: 'Board confidence' } };
    render(<GmInboxPanel pack={pack} messages={[m]} onAnswer={() => undefined} seen={new Set()} fx={fx} />);
    fireEvent.click(document.querySelector('[data-inbox-row="f"]')!);
    expect(screen.getByText('Sit him · Owner trust +1, Your franchise player out 2 weeks, Board confidence +2').tagName).toBe('BUTTON');
  });
});
