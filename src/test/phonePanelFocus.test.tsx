import { StrictMode, useState } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PhonePanel from '@/components/soccer-career/PhonePanel';
import { answerPhoneText, initCareer, type CareerState } from '@/lib/soccerCareerEngine';
import { CONTACTS, contactAvailable, contactName, convoTopic, mirrorLegacyMessage, phoneThreads, starterConvos, threadReplies } from '@/lib/soccerPhone';
import { ensureMoney, spendable } from '@/lib/soccerMoney';

function fixture() {
  const career = initCareer('Fixture Phone Player', 'England', 'CM', 'modern', { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 }, 60, 2026,
    [{ id: 'fixture-club', name: 'Fixture Academy', country: 'England', tier: 2, color: '#168256', league: 'Fixture League' }]);
  career.netWorth = 2;
  ensureMoney(career);
  career.phone!.threads = [];
  career.phoneInbox = [{ id: 'fixture-2026', defId: 'fixture', from: 'Fixture Mentor', emoji: '💬', text: 'Fixture training discussion', year: 2026,
    choices: [{ label: 'Fixture first reply', reply: 'Fixture first answer', karma: 2 }, { label: 'Fixture second reply', reply: 'Fixture second answer', karma: 6, morale: 3 }] }];
  mirrorLegacyMessage(career, 'fixture-2026', 'Fixture Mentor', 'Fixture training discussion', 2026);
  return career;
}
const callbacks = () => ({ onAnswer: vi.fn(), onMoney: vi.fn(), onBuyItem: vi.fn(), onClose: vi.fn() });
function Host({ initial, handlers, commit = false }: { initial: CareerState; handlers: ReturnType<typeof callbacks>; commit?: boolean }) {
  const [open, setOpen] = useState(false);
  const [career, setCareer] = useState(initial);
  return <><button onClick={() => setOpen(true)}>Open fixture phone</button><button>Behind phone</button>
    {open && <PhonePanel career={career} {...handlers} onClose={() => { handlers.onClose(); setOpen(false); }}
      onAnswer={(id, index) => { handlers.onAnswer(id, index); if (commit) setCareer(answerPhoneText(JSON.parse(JSON.stringify(career)), id, index)); }} />}</>;
}
function draw(initial = fixture(), handlers = callbacks(), commit = false, strict = false) {
  const host = <Host initial={initial} handlers={handlers} commit={commit} />;
  const view = render(strict ? <StrictMode>{host}</StrictMode> : host);
  const opener = view.getByRole('button', { name: 'Open fixture phone' }); opener.focus(); fireEvent.click(opener);
  return { ...view, opener, handlers, initial };
}
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const labels: Record<string, string> = { messages: 'Messages', contacts: 'Contacts', news: 'SportsFeed', column: 'The Column', bank: 'Bank', market: 'Market', shop: 'My Life', arcade: 'Ball Quiz', cards: 'Cards', social: 'SocialGram', player: 'My Player', peaks: 'Peaks', life: 'Life' };
const app = (id: string) => dialog().querySelector<HTMLButtonElement>(`[data-phone-app="${id}"]`) ?? within(dialog()).getByRole<HTMLButtonElement>('button', { name: new RegExp(`${labels[id]}$`) });
const back = () => dialog().querySelector<HTMLButtonElement>('[data-phone-back]') ?? dialog().querySelector<HTMLButtonElement>('button')!;
const close = () => within(dialog()).getByRole<HTMLButtonElement>('button', { name: 'Put phone away' });
const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockReturnValue(.314159); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('actual Soccer Career phone focus', () => {
  it('keeps thirteen original apps reachable without mutating career, funds or storage', () => {
    const initial = fixture(), original = JSON.stringify(initial), handlers = callbacks();
    const write = vi.spyOn(Storage.prototype, 'setItem'); draw(initial, handlers);
    const ids = [...dialog().querySelectorAll<HTMLElement>('[data-phone-app]')].map(el => el.dataset.phoneApp);
    expect(ids).toEqual(['messages', 'contacts', 'news', 'column', 'bank', 'market', 'shop', 'arcade', 'cards', 'social', 'player', 'peaks', 'life']);
    for (const id of ids) { fireEvent.click(app(id!)); fireEvent.click(back()); expect(app(id!)).toBeVisible(); }
    expect(JSON.stringify(initial)).toBe(original); expect(write).not.toHaveBeenCalled();
    expect(handlers.onAnswer).not.toHaveBeenCalled(); expect(handlers.onMoney).not.toHaveBeenCalled(); expect(handlers.onBuyItem).not.toHaveBeenCalled();
  });

  it('contains both Tab boundaries and ShiftTab from the initially focused dialog', () => {
    draw(); const first = app('messages'), last = close();
    expect(dialog()).toHaveFocus(); expect(fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true })).toBe(false); expect(last).toHaveFocus();
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false); expect(first).toHaveFocus();
    expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false); expect(last).toHaveFocus();
    first.focus(); expect(fireEvent.keyDown(first, { key: 'Tab' })).toBe(true);
  });

  it('excludes disabled and hidden controls from the live Tab boundary', () => {
    draw(); fireEvent.click(app('bank'));
    const last = close(); const footer = last.parentElement!; footer.style.display = 'none';
    const enabled = [...dialog().querySelectorAll<HTMLButtonElement>('button')].filter(button => !button.disabled && button !== last).at(-1)!;
    back().focus(); expect(fireEvent.keyDown(back(), { key: 'Tab', shiftKey: true })).toBe(false); expect(enabled).toHaveFocus();
    footer.style.display = ''; last.disabled = true; last.tabIndex = 0;
    back().focus(); fireEvent.keyDown(back(), { key: 'Tab', shiftKey: true }); expect(enabled).toHaveFocus();
  });

  it('closes once on Escape and returns the exact connected opener without scrolling', async () => {
    const view = draw(), bubble = vi.fn(); window.addEventListener('keydown', bubble);
    const focus = vi.spyOn(view.opener, 'focus'); fireEvent.keyDown(close(), { key: 'Escape' }); await flush();
    expect(view.queryByRole('dialog')).toBeNull(); expect(view.handlers.onClose).toHaveBeenCalledTimes(1); expect(view.opener).toHaveFocus();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(bubble).not.toHaveBeenCalled(); window.removeEventListener('keydown', bubble);
  });

  it('returns the original opener after the native close action', async () => {
    const view = draw(); fireEvent.click(close()); await flush();
    expect(view.opener).toHaveFocus(); expect(view.handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('returns the original opener after the backdrop action without closing on content taps', async () => {
    const view = draw(); fireEvent.click(dialog()); expect(view.handlers.onClose).not.toHaveBeenCalled();
    fireEvent.click(dialog().parentElement!); await flush();
    expect(view.opener).toHaveFocus(); expect(view.handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not focus a disconnected opener on cleanup', async () => {
    const opener = document.createElement('button'); document.body.append(opener); opener.focus();
    const view = render(<PhonePanel career={fixture()} {...callbacks()} />); opener.remove(); const focus = vi.spyOn(opener, 'focus');
    view.unmount(); await flush(); expect(focus).not.toHaveBeenCalled();
  });

  it('keeps StrictMode initialization and cloned career rerenders quiet while a control remains focused', async () => {
    const initial = fixture(), handlers = callbacks(), view = render(<StrictMode><PhonePanel career={initial} {...handlers} /></StrictMode>); await flush();
    expect(dialog()).toHaveFocus(); const retained = app('contacts'); retained.focus();
    view.rerender(<StrictMode><PhonePanel career={JSON.parse(JSON.stringify(initial))} {...handlers} /></StrictMode>); await flush();
    expect(retained).toHaveFocus(); expect(app('contacts')).toBe(retained); expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it('focuses stable Back controls and the original app tile across thread navigation', () => {
    const initial = fixture(), thread = phoneThreads(initial)[0]; draw(initial);
    fireEvent.click(app('messages')); expect(back()).toHaveFocus();
    const row = within(dialog()).getByRole('button', { name: new RegExp(thread.name) }); row.focus(); fireEvent.click(row);
    expect(back()).toHaveFocus(); expect(back()).toHaveTextContent('Chats'); fireEvent.click(back()); expect(back()).toHaveFocus();
    fireEvent.click(back()); expect(app('messages')).toHaveFocus();
  });

  it('passes the exact original non-first thread index through the real answer helper', () => {
    const initial = fixture(), original = JSON.stringify(initial), thread = phoneThreads(initial)[0], replies = threadReplies(initial, thread);
    const view = draw(initial, callbacks(), true); fireEvent.click(app('messages')); fireEvent.click(within(dialog()).getByRole('button', { name: new RegExp(thread.name) }));
    const chosen = within(dialog()).getByRole('button', { name: replies[1].label }); chosen.focus(); fireEvent.click(chosen);
    expect(view.handlers.onAnswer).toHaveBeenCalledExactlyOnceWith(thread.id, 1);
    const expected = answerPhoneText(JSON.parse(original), thread.id, 1), expectedThread = phoneThreads(expected).find(t => t.id === thread.id)!;
    for (const line of expectedThread.lines) expect(within(dialog()).getByText(line.t)).toBeVisible();
    expect(JSON.stringify(initial)).toBe(original); expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it('preserves available contacts, starter ordering and the original open-contact callback', () => {
    const initial = fixture(), available = CONTACTS.filter(c => contactAvailable(c.id, initial, 'youth'));
    const candidate = available.find(c => starterConvos(initial, c.id, 'youth').length > 1)!; expect(candidate).toBeDefined();
    const starters = starterConvos(initial, candidate.id, 'youth'), view = draw(initial);
    fireEvent.click(app('contacts')); fireEvent.click(within(dialog()).getByRole('button', { name: new RegExp(contactName(candidate.id, initial)) }));
    expect(back()).toHaveFocus(); fireEvent.click(within(dialog()).getByRole('button', { name: convoTopic(starters[1]) }));
    expect(view.handlers.onAnswer).toHaveBeenCalledExactlyOnceWith(`open:${candidate.id}`, 1);
    expect(back()).toHaveFocus(); fireEvent.click(back()); expect(back()).toHaveFocus(); fireEvent.click(back()); expect(app('contacts')).toHaveFocus();
  });

  it('retains the exact existing money callback and quiet focus after a refused action', () => {
    const initial = fixture(), original = JSON.stringify(initial), view = draw(initial); fireEvent.click(app('bank'));
    const save = within(dialog()).getByRole('button', { name: 'Save half' }); save.focus(); fireEvent.click(save);
    expect(view.handlers.onMoney).toHaveBeenCalledExactlyOnceWith({ t: 'deposit', amount: spendable(initial) * .5 });
    expect(save).toHaveFocus(); expect(view.handlers.onAnswer).not.toHaveBeenCalled(); expect(view.handlers.onBuyItem).not.toHaveBeenCalled();
    expect(JSON.stringify(initial)).toBe(original); expect(localStorage.length).toBe(0);
  });
});
