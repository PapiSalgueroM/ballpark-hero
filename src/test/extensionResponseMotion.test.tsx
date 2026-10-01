import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import ExtensionCard from '@/components/us-career/ExtensionCard';
import motion from '@/components/us-career/ExtensionMotion.module.css';
import { buildExtension, extensionHeadline, pushExtension, type ExtensionTalk } from '@/lib/usCareerExtension';

const talkFor = (overall: number) => buildExtension({
  sport: 'nba', team: 'fixture-team', label: 'Fixture Team', market: 10, minSalary: 1,
  ovr: overall, age: 25, accolades: 0, cliffAge: 32, rng: () => 0.5,
});
const push = (talk: ExtensionTalk, overall: number, roll: number) => pushExtension(talk, {
  ovr: overall, age: 25, accolades: 0, cliffAge: 32, rng: () => roll,
});
const callbacks = () => ({ onPush: vi.fn(), onSign: vi.fn(), onDecline: vi.fn() });
const draw = (talk: ExtensionTalk, handlers: ReturnType<typeof callbacks>) => (
  <ExtensionCard talk={talk} seasonWord="season" {...handlers} />
);
const assertOffer = (view: ReturnType<typeof render>, talk: ExtensionTalk) => {
  expect(talk.offer).not.toBeNull();
  const offer = talk.offer!;
  const salary = view.container.querySelector('[data-ext-salary]');
  expect(salary).toHaveAttribute('data-ext-salary', String(offer.salary));
  expect(salary).toHaveTextContent(`$${offer.salary}M`);
  expect(view.getByText(String(offer.years), { exact: true })).toBeInTheDocument();
  const gap = Math.round(((offer.salary - talk.market) / Math.max(0.1, talk.market)) * 100);
  expect(view.getByText(`${gap >= 0 ? '+' : ''}${gap}%`)).toBeInTheDocument();
  expect(view.getByText(offer.line)).toBeInTheDocument();
  expect(view.getByRole('button', { name: `Sign it: ${extensionHeadline(talk)}` })).toBeEnabled();
};

afterEach(cleanup);

describe('extension response motion', () => {
  it('keeps the opening offer reply quiet and the exact market comparison available', () => {
    const talk = talkFor(90);
    const original = JSON.stringify(talk);
    const handlers = callbacks();
    const view = render(draw(talk, handlers));
    const reply = view.container.querySelector('[data-extension-reply]');
    expect(reply).toHaveAttribute('data-extension-reply', 'opening');
    expect(reply).not.toHaveClass(motion.reply);
    expect(reply).toHaveTextContent(talk.note);
    expect(reply).toHaveTextContent(`The market would pay about $${talk.market}M.`);
    assertOffer(view, talk);
    fireEvent.click(view.getByRole('button', { name: `Sign it: ${extensionHeadline(talk)}` }));
    fireEvent.click(view.getByRole('button', { name: 'Turn it down and play the year out' }));
    expect(handlers.onSign).toHaveBeenCalledTimes(1);
    expect(handlers.onDecline).toHaveBeenCalledTimes(1);
    expect(handlers.onPush).not.toHaveBeenCalled();
    expect(JSON.stringify(talk)).toBe(original);
  });

  it('keeps a genuine no-offer opening quiet with only the play-out action', () => {
    const talk = talkFor(72);
    expect(talk.offer).toBeNull();
    const handlers = callbacks();
    const view = render(draw(talk, handlers));
    const reply = view.container.querySelector('[data-extension-reply]');
    expect(reply).not.toHaveClass(motion.reply);
    expect(reply).toHaveTextContent(talk.note);
    expect(view.container.querySelector('[data-ext-salary]')).toBeNull();
    const decline = view.getByRole('button', { name: 'Play the year out' });
    expect(view.getAllByRole('button')).toEqual([decline]);
    fireEvent.click(decline);
    expect(handlers.onDecline).toHaveBeenCalledTimes(1);
    expect(handlers.onPush).not.toHaveBeenCalled();
    expect(handlers.onSign).not.toHaveBeenCalled();
  });

  it.each([
    { outcome: 'improved', overall: 90, roll: 0.5 },
    { outcome: 'held', overall: 80, roll: 0.9 },
    { outcome: 'pulled', overall: 79, roll: 0.1 },
  ])('reveals the exact $outcome engine reply without replacing remaining controls', ({ outcome, overall, roll }) => {
    const talk = talkFor(overall);
    expect(talk.offer).not.toBeNull();
    const original = JSON.stringify(talk);
    const handlers = callbacks();
    const view = render(draw(talk, handlers));
    const oldReply = view.container.querySelector('[data-extension-reply]');
    const header = oldReply?.parentElement;
    const card = view.container.querySelector('[data-extension-talk]');
    const ask = view.getByRole('button', { name: 'Ask for more, once' });
    const sign = view.getByRole('button', { name: `Sign it: ${extensionHeadline(talk)}` });
    const decline = view.getByRole('button', { name: 'Turn it down and play the year out' });
    fireEvent.click(ask);
    expect(handlers.onPush).toHaveBeenCalledTimes(1);
    (outcome === 'pulled' ? decline : sign).focus();
    const resolved = push(talk, overall, roll);
    expect(resolved.pushed).toBe(true);
    expect(resolved.note).not.toBe(talk.note);
    if (outcome === 'improved') expect(resolved.offer!.salary).toBeGreaterThan(talk.offer!.salary);
    if (outcome === 'held') expect(resolved.offer).toEqual(talk.offer);
    if (outcome === 'pulled') {
      expect(resolved.pulled).toBe(true);
      expect(resolved.offer).toBeNull();
    }
    view.rerender(draw(resolved, handlers));
    const reply = view.container.querySelector('[data-extension-reply]');
    expect(reply).not.toBe(oldReply);
    expect(reply?.parentElement).toBe(header);
    expect(reply).toHaveAttribute('data-extension-reply', 'resolved');
    expect(reply).toHaveTextContent(resolved.note);
    expect(reply).toHaveClass(motion.reply);
    expect(view.container.querySelector('[data-extension-talk]')).toBe(card);
    if (resolved.offer) {
      assertOffer(view, resolved);
      expect(view.getByRole('button', { name: `Sign it: ${extensionHeadline(resolved)}` })).toBe(sign);
      expect(document.activeElement).toBe(sign);
      expect(view.getByRole('button', { name: 'You have made your case' })).toBe(ask);
      expect(ask).toBeDisabled();
      fireEvent.click(ask);
      expect(handlers.onPush).toHaveBeenCalledTimes(1);
      fireEvent.click(sign);
      expect(handlers.onSign).toHaveBeenCalledTimes(1);
      expect(view.getByRole('button', { name: 'Turn it down and play the year out' })).toBe(decline);
    } else {
      expect(view.container.querySelector('[data-ext-salary]')).toBeNull();
      expect(view.queryByRole('button', { name: /^Sign it:/ })).toBeNull();
      expect(view.queryByRole('button', { name: 'You have made your case' })).toBeNull();
      expect(view.getByRole('button', { name: 'Play the year out' })).toBe(decline);
      expect(document.activeElement).toBe(decline);
      expect(handlers.onSign).not.toHaveBeenCalled();
    }
    const replyClass = reply?.className;
    view.rerender(draw(JSON.parse(JSON.stringify(resolved)) as ExtensionTalk, handlers));
    expect(view.container.querySelector('[data-extension-reply]')).toBe(reply);
    expect(reply?.className).toBe(replyClass);
    expect(view.getByRole('button', { name: resolved.offer ? 'Turn it down and play the year out' : 'Play the year out' })).toBe(decline);
    fireEvent.click(decline);
    expect(handlers.onDecline).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(talk)).toBe(original);
  });
});
