import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { TradeTalksCard } from '@/components/front-office-shared/TradeTalksCard';
import motion from '@/components/front-office-shared/TradeTalksMotion.module.css';
import { openTalks, standFirm, type TalksArgs, type TalksPlayer, type TalksState } from '@/lib/foTradeTalks';

const mine: TalksPlayer = { id: 'mine', name: 'Home Guard', pos: 'PG', ovr: 84, age: 25, salary: 8 };
const args = (overall = 82): TalksArgs => {
  const want = { id: 'want', name: 'Away Wing', pos: 'SF', ovr: overall, age: 26, salary: 9 };
  return {
    mine, want, theirRoster: [want], myPickCount: 1, pickValue: 12,
    value: player => player.ovr, theirCoverAtMyPos: 0, openPremium: 1.08,
  };
};
const callbacks = () => ({ onAccept: vi.fn(), onStandFirm: vi.fn(), onWalkAway: vi.fn() });
const replyNodes = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-trade-reply]'));
const renderCard = (talks: TalksState, handlers = callbacks()) => ({
  ...render(<TradeTalksCard talks={talks} partnerLabel="Away Team" mine={mine} {...handlers} />), handlers,
});

afterEach(cleanup);

describe('trade talks motion', () => {
  it.each([
    { phase: 'agreed', talks: openTalks(args(72)) },
    { phase: 'counter', talks: openTalks(args()) },
    { phase: 'dead', talks: openTalks(args(99)) },
  ] as const)('reveals the exact engine-authored $phase reply and immediate actions', ({ phase, talks }) => {
    expect(talks.phase).toBe(phase);
    const original = JSON.stringify({ talks, mine });
    const view = renderCard(talks);
    const card = view.container.querySelector('[data-trade-talks]');
    expect(card).toHaveAttribute('data-trade-phase', phase);
    expect(card).toHaveClass(motion.card);
    expect(view.getByText('📞 Talks with Away Team')).toBeVisible();
    expect(view.getByText(mine.name).closest('span')).toHaveTextContent('You send: Home Guard (PG 84)');
    const replies = replyNodes(view.container);
    expect(replies.map(reply => reply.textContent)).toEqual(talks.log);
    expect(replies.at(-1)).toHaveClass(motion.reply);
    if (phase === 'agreed') expect(replies.at(-1)).toHaveClass(motion.agreed);
    if (phase === 'dead') expect(replies.at(-1)).toHaveClass(motion.ended);
    if (talks.pkg) {
      expect(view.getByText(talks.pkg.theirPlayerName).closest('span')).toHaveTextContent(
        `On the table: ${talks.pkg.theirPlayerName}${talks.pkg.addPick ? ' + your pick' : ''}`,
      );
      const accept = view.getByRole('button', { name: phase === 'agreed' ? 'Shake on it' : 'Take the deal' });
      expect(accept).toBeEnabled();
      fireEvent.click(accept);
      expect(view.handlers.onAccept).toHaveBeenCalledTimes(1);
    } else {
      expect(view.queryByText(/On the table:/)).toBeNull();
      expect(view.handlers.onAccept).not.toHaveBeenCalled();
    }
    if (phase === 'counter') {
      fireEvent.click(view.getByRole('button', { name: 'Stand firm' }));
      expect(view.handlers.onStandFirm).toHaveBeenCalledTimes(1);
    } else {
      expect(view.queryByRole('button', { name: 'Stand firm' })).toBeNull();
      expect(view.handlers.onStandFirm).not.toHaveBeenCalled();
    }
    const walk = view.getByRole('button', { name: phase === 'dead' ? 'Put the phone down' : 'Walk away' });
    expect(walk).toBeEnabled();
    fireEvent.click(walk);
    expect(view.handlers.onWalkAway).toHaveBeenCalledTimes(1);
    expect(JSON.stringify({ talks, mine })).toBe(original);
  });

  it('reveals appended replies without replaying old lines or replacing focused controls', () => {
    const offer = args();
    const talks = openTalks(offer);
    const original = JSON.stringify({ talks, mine });
    const view = renderCard(talks);
    const firstReply = replyNodes(view.container)[0];
    const card = view.container.querySelector('[data-trade-talks]');
    const accept = view.getByRole('button', { name: 'Take the deal' });
    const firm = view.getByRole('button', { name: 'Stand firm' });
    fireEvent.click(firm);
    accept.focus();
    const pushed = standFirm(talks, offer, () => 1);
    expect(pushed.phase).toBe('counter');
    expect(pushed.log).toHaveLength(talks.log.length + 2);
    view.rerender(<TradeTalksCard talks={pushed} partnerLabel="Away Team" mine={mine} {...view.handlers} />);
    const replies = replyNodes(view.container);
    expect(replies.map(reply => reply.textContent)).toEqual(pushed.log);
    expect(replies[0]).toBe(firstReply);
    expect(firstReply).toHaveAttribute('data-trade-reply', 'earlier');
    expect(firstReply).not.toHaveClass(motion.reply);
    expect(replies.at(-1)).toHaveAttribute('data-trade-reply', 'latest');
    expect(replies.at(-1)).toHaveClass(motion.reply);
    expect(view.container.querySelector('[data-trade-talks]')).toBe(card);
    expect(view.getByRole('button', { name: 'Take the deal' })).toBe(accept);
    expect(document.activeElement).toBe(accept);
    expect(view.getByRole('button', { name: 'You already pushed' })).toBe(firm);
    expect(firm).toBeDisabled();
    fireEvent.click(firm);
    expect(view.handlers.onStandFirm).toHaveBeenCalledTimes(1);
    fireEvent.click(accept);
    expect(view.handlers.onAccept).toHaveBeenCalledTimes(1);
    expect(view.handlers.onWalkAway).not.toHaveBeenCalled();
    expect(JSON.stringify({ talks, mine })).toBe(original);
  });

  it('keeps the accept button and focus when a real push reaches an agreement', () => {
    const offer = args();
    const talks = openTalks(offer);
    const view = renderCard(talks);
    const accept = view.getByRole('button', { name: 'Take the deal' });
    const walk = view.getByRole('button', { name: 'Walk away' });
    accept.focus();
    const agreed = standFirm(talks, offer, () => 0);
    expect(agreed.phase).toBe('agreed');
    view.rerender(<TradeTalksCard talks={agreed} partnerLabel="Away Team" mine={mine} {...view.handlers} />);
    expect(view.getByRole('button', { name: 'Shake on it' })).toBe(accept);
    expect(document.activeElement).toBe(accept);
    expect(accept).toBeEnabled();
    expect(view.getByRole('button', { name: 'Walk away' })).toBe(walk);
    expect(view.queryByRole('button', { name: 'Stand firm' })).toBeNull();
    expect(view.queryByText('+ your pick', { exact: false })).toBeNull();
    expect(replyNodes(view.container).map(reply => reply.textContent)).toEqual(agreed.log);
    fireEvent.click(accept);
    expect(view.handlers.onAccept).toHaveBeenCalledTimes(1);
    expect(view.handlers.onStandFirm).not.toHaveBeenCalled();
    expect(view.handlers.onWalkAway).not.toHaveBeenCalled();
  });

  it('keeps the walk-away button and focus when a real push ends the call', () => {
    const offer = args(84);
    const talks = openTalks(offer);
    expect(talks.phase).toBe('counter');
    const view = renderCard(talks);
    const walk = view.getByRole('button', { name: 'Walk away' });
    walk.focus();
    const ended = standFirm(talks, offer, () => 1);
    expect(ended.phase).toBe('dead');
    view.rerender(<TradeTalksCard talks={ended} partnerLabel="Away Team" mine={mine} {...view.handlers} />);
    expect(view.getByRole('button', { name: 'Put the phone down' })).toBe(walk);
    expect(document.activeElement).toBe(walk);
    expect(walk).toBeEnabled();
    expect(view.getAllByRole('button')).toEqual([walk]);
    expect(view.queryByText(/On the table:/)).toBeNull();
    expect(replyNodes(view.container).map(reply => reply.textContent)).toEqual(ended.log);
    fireEvent.click(walk);
    expect(view.handlers.onWalkAway).toHaveBeenCalledTimes(1);
    expect(view.handlers.onAccept).not.toHaveBeenCalled();
    expect(view.handlers.onStandFirm).not.toHaveBeenCalled();
  });
});
