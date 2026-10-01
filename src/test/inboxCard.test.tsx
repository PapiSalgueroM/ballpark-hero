import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { InboxCard } from '@/components/club-manager/InboxCard';
import motion from '@/components/club-manager/InboxCard.module.css';
import { answerMessage, type CareerState, type PlayerMessage } from '@/lib/clubManager';

const fixture = (): PlayerMessage[] => Array.from({ length: 8 }, (_, index) => ({
  id: `fixture-message-${index}`, playerId: `fixture-player-${index}`, playerName: `Fixture Player ${index}`,
  kind: index === 6 ? 'roleTalk' : 'startMe', from: index === 7 ? 'Fixture reporter' : 'Your captain',
  text: `Fixture request ${index} needs a reply.`, week: 24 - index,
  options: [{ label: `Listen ${index}`, effect: 'listen' }, { label: `Promise ${index}`, effect: 'promise' }, { label: `Refuse ${index}`, effect: 'refuse' }],
  ...(index < 5 ? { resolved: `Fixture stored outcome ${index}, exactly as saved.` } : {}),
}));
const career = (inbox = fixture()): CareerState => ({
  inbox, week: 24, budget: 500, promisedStarts: [],
  squad: inbox.map(message => ({ id: message.playerId, morale: 50 })),
} as unknown as CareerState);
const cards = (container: HTMLElement) => [...container.querySelectorAll<HTMLDivElement>('[data-inbox-message]')];
const ids = (container: HTMLElement) => cards(container).map(card => card.dataset.inboxMessage);
const count = (container: HTMLElement, text: string) => expect(within(container).getByRole('status')).toHaveTextContent(text);
const show = (container: HTMLElement, name: string) => fireEvent.click(within(container).getByRole('button', { name }));
const query = (container: HTMLElement, value: string) => fireEvent.change(within(container).getByRole('searchbox', { name: 'Search messages' }), { target: { value } });

function CommittingInbox({ initial, onAnswer }: { initial: CareerState; onAnswer: (id: string, index: number) => void }) {
  const [state, setState] = useState(initial);
  return <><button onClick={() => setState(previous => ({ ...previous, inbox: previous.inbox!.map(message => ({ ...message })) }))}>Clone fixture state</button><InboxCard career={state} onAnswer={(id, index) => { onAnswer(id, index); setState(previous => answerMessage(previous, id, index)); }} /></>;
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Club Manager retained inbox', () => {
  it('preserves the default newest four and counts all eight retained messages', () => {
    const state = career();
    const view = render(<InboxCard career={state} onAnswer={vi.fn()} />);
    expect(ids(view.container)).toEqual(state.inbox!.slice(0, 4).map(message => message.id));
    count(view.container, 'Showing 4 of 8 retained messages.');
    expect(view.getByRole('button', { name: 'Pending (3)' })).toHaveAttribute('aria-pressed', 'false');
    expect(view.getByRole('button', { name: 'Resolved (5)' })).toBeVisible();
    expect(view.getByRole('button', { name: 'All (8)' })).toHaveAttribute('aria-pressed', 'true');
    expect(view.getByText('Recent retained messages. Older messages can leave your save.')).toBeVisible();
    cards(view.container).forEach((card, index) => expect(card).toHaveTextContent(`Week ${state.inbox![index].week}`));
    expect(view.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
  });

  it('loads every retained message and sends the older original ID and option index', () => {
    const state = career();
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={state} onAnswer={onAnswer} />);
    const original = cards(view.container);
    view.getByRole('button', { name: 'Load more messages' }).focus();
    show(view.container, 'Load more messages');
    expect(ids(view.container)).toEqual(state.inbox!.map(message => message.id));
    count(view.container, 'Showing 8 of 8 retained messages.');
    expect(view.queryByRole('button', { name: 'Load more messages' })).toBeNull();
    original.forEach((card, index) => expect(cards(view.container)[index]).toBe(card));
    expect(cards(view.container)[4]).toHaveFocus();
    const older = cards(view.container)[7];
    expect(within(older).getAllByRole('button').map(button => button.textContent)).toEqual(state.inbox![7].options.map(option => option.label));
    fireEvent.click(within(older).getByRole('button', { name: 'Refuse 7' }));
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('fixture-message-7', 2);
  });

  it('shows pending and resolved views in retained order with independently bounded pages', () => {
    const state = career();
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={state} onAnswer={onAnswer} />);
    show(view.container, 'Pending (3)');
    expect(ids(view.container)).toEqual(state.inbox!.slice(5).map(message => message.id));
    count(view.container, 'Showing 3 of 3 pending messages.');
    expect(view.queryByRole('button', { name: 'Load more messages' })).toBeNull();
    show(view.container, 'Resolved (5)');
    expect(ids(view.container)).toEqual(state.inbox!.slice(0, 4).map(message => message.id));
    count(view.container, 'Showing 4 of 5 resolved messages.');
    show(view.container, 'Load more messages');
    expect(ids(view.container)).toEqual(state.inbox!.slice(0, 5).map(message => message.id));
    count(view.container, 'Showing 5 of 5 resolved messages.');
    show(view.container, 'All (8)');
    count(view.container, 'Showing 4 of 8 retained messages.');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('searches existing sender, player, kind, request and outcome within the active view and resets', () => {
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={career()} onAnswer={onAnswer} />);
    for (const [search, id] of [['REPORTER', '7'], ['player 6', '6'], ['role talk', '6'], ['request 5', '5'], ['outcome 4', '4']]) {
      query(view.container, search);
      expect(ids(view.container)).toEqual([`fixture-message-${id}`]);
      count(view.container, 'Showing 1 of 1 retained messages.');
    }
    show(view.container, 'Pending (3)');
    count(view.container, 'Showing 0 of 0 pending messages.');
    expect(view.getByText('No messages match your search in this view.')).toBeVisible();
    show(view.container, 'Reset filters');
    expect(view.getByRole('searchbox')).toHaveValue('');
    expect(view.getByRole('button', { name: 'All (8)' })).toHaveAttribute('aria-pressed', 'true');
    count(view.container, 'Showing 4 of 8 retained messages.');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('distinguishes empty views and mounts safely when an empty inbox receives messages', () => {
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={career([])} onAnswer={onAnswer} />);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<InboxCard career={career(fixture().slice(0, 2))} onAnswer={onAnswer} />);
    show(view.container, 'Pending (0)');
    expect(view.getByText('No pending messages.')).toBeVisible();
    count(view.container, 'Showing 0 of 0 pending messages.');
    view.rerender(<InboxCard career={career(fixture().slice(5))} onAnswer={onAnswer} />);
    show(view.container, 'Resolved (0)');
    expect(view.getByText('No resolved messages yet.')).toBeVisible();
    count(view.container, 'Showing 0 of 0 resolved messages.');
    query(view.container, 'no such message');
    expect(view.getByText('No messages match your search in this view.')).toBeVisible();
  });

  it('renders restored outcomes and stored weeks exactly with no inferred choice or reply controls', () => {
    const inbox = fixture();
    inbox[0].resolved = 'Fixture automatically resolved outcome, no chosen option was saved.';
    const view = render(<InboxCard career={career(inbox)} onAnswer={vi.fn()} />);
    const first = cards(view.container)[0];
    expect(first).toHaveTextContent(inbox[0].text);
    expect(first).toHaveTextContent(inbox[0].resolved!);
    expect(first).toHaveTextContent('Week 24');
    expect(within(first).queryByRole('button')).toBeNull();
    expect(first).not.toHaveClass(motion.committed);
    expect(first).not.toHaveAttribute('data-inbox-feedback');
  });

  it('cues only an actual engine reply commit in place, then stays quiet after clones and view changes', () => {
    vi.useFakeTimers();
    const state = career();
    const onAnswer = vi.fn();
    const view = render(<CommittingInbox initial={state} onAnswer={onAnswer} />);
    show(view.container, 'Load more messages');
    const original = cards(view.container)[7];
    const outcome = answerMessage(state, 'fixture-message-7', 1);
    fireEvent.click(within(original).getByRole('button', { name: 'Promise 7' }));
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('fixture-message-7', 1);
    expect(cards(view.container)[7]).toBe(original);
    expect(original).toHaveClass(motion.committed);
    expect(original).toHaveAttribute('data-inbox-feedback', 'committed');
    expect(original).toHaveTextContent(outcome.inbox![7].resolved!);
    expect(original).toHaveFocus();
    expect(within(original).queryByRole('button')).toBeNull();
    expect(view.getByRole('button', { name: 'Pending (2)' })).toBeVisible();
    act(() => vi.advanceTimersByTime(200));
    show(view.container, 'Clone fixture state');
    expect(cards(view.container)[7]).toBe(original);
    expect(original).toHaveClass(motion.committed);
    act(() => vi.advanceTimersByTime(301));
    expect(original).not.toHaveClass(motion.committed);
    expect(original).not.toHaveAttribute('data-inbox-feedback');
    show(view.container, 'Clone fixture state');
    expect(cards(view.container)[7]).toBe(original);
    expect(original).not.toHaveClass(motion.committed);
    show(view.container, 'Resolved (6)');
    show(view.container, 'Load more messages');
    expect(view.container.querySelector('[data-inbox-feedback]')).toBeNull();
    expect(state.inbox![7].resolved).toBeUndefined();
    expect(outcome.squad[7].morale).toBe(60);
    expect(outcome.promisedStarts).toEqual(['fixture-player-7']);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    show(view.container, 'Pending (2)');
    fireEvent.click(view.getByRole('button', { name: 'Listen 6' }));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns focus to the active pending view when the committed reply removes its card', () => {
    const onAnswer = vi.fn();
    const view = render(<CommittingInbox initial={career()} onAnswer={onAnswer} />);
    show(view.container, 'Pending (3)');
    fireEvent.click(view.getByRole('button', { name: 'Listen 7' }));
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('fixture-message-7', 0);
    expect(ids(view.container)).toEqual(['fixture-message-5', 'fixture-message-6']);
    count(view.container, 'Showing 2 of 2 pending messages.');
    expect(view.getByRole('button', { name: 'Pending (2)' })).toHaveFocus();
    show(view.container, 'Resolved (6)');
    show(view.container, 'Load more messages');
    expect(view.getByText('You heard him out. Sometimes that is all it takes.')).toBeVisible();
    expect(view.container.querySelector('[data-inbox-feedback]')).toBeNull();
  });

  it('keeps a no-op answer, later automatic resolution and cloned restored history quiet', () => {
    vi.useFakeTimers();
    const state = career();
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={state} onAnswer={onAnswer} />);
    show(view.container, 'Load more messages');
    const original = cards(view.container)[7];
    fireEvent.click(within(original).getByRole('button', { name: 'Listen 7' }));
    expect(view.container.querySelector('[data-inbox-feedback]')).toBeNull();
    const restored = { ...state, inbox: state.inbox!.map(message => ({ ...message, ...(message.id === 'fixture-message-7' ? { resolved: 'Fixture later automatic resolution.' } : {}) })) };
    view.rerender(<InboxCard career={restored} onAnswer={onAnswer} />);
    expect(cards(view.container)[7]).toBe(original);
    expect(original).toHaveTextContent('Fixture later automatic resolution.');
    expect(original).not.toHaveClass(motion.committed);
    expect(view.container.querySelector('[data-inbox-feedback]')).toBeNull();
    view.rerender(<InboxCard career={{ ...restored, inbox: restored.inbox.map(message => ({ ...message })) }} onAnswer={onAnswer} />);
    expect(cards(view.container)[7]).toBe(original);
    expect(original).not.toHaveClass(motion.committed);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps filter focus, full accessible copy and 44px controls without callbacks, random draws or writes', () => {
    const inbox = fixture();
    inbox[0].from = 'FixtureSenderWithAVeryLongUnbrokenNameForNarrowPhoneTesting';
    inbox.forEach(message => { message.options.forEach(Object.freeze); Object.freeze(message.options); Object.freeze(message); });
    Object.freeze(inbox);
    const state = career(inbox);
    const before = JSON.stringify(state);
    const onAnswer = vi.fn();
    const view = render(<InboxCard career={state} onAnswer={onAnswer} />);
    const random = vi.spyOn(Math, 'random');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const search = view.getByRole('searchbox');
    search.focus();
    query(view.container, 'FixtureSender');
    expect(search).toHaveFocus();
    expect(view.getByText(inbox[0].from!)).toBeVisible();
    view.rerender(<InboxCard career={{ ...state, inbox: [...inbox] }} onAnswer={onAnswer} />);
    expect(view.getByRole('searchbox')).toBe(search);
    expect(search).toHaveFocus();
    show(view.container, 'Reset filters');
    show(view.container, 'Load more messages');
    view.getAllByRole('button').forEach(button => expect(button.className).toContain('min-h-[44px]'));
    expect(search.className).toContain('min-h-[44px]');
    expect(cards(view.container)[0]).toHaveClass(motion.card);
    expect(JSON.stringify(state)).toBe(before);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  });
});
