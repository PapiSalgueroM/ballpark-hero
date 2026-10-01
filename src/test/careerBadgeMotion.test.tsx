import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { BadgeGrid } from '@/components/us-career/SocialPanel';
import motion from '@/components/us-career/BadgeGrid.module.css';
import { earnedBadges, type BadgeDef } from '@/lib/careerBadges';

interface FixtureFacts { milestones: number }
const longLabel = 'Fixture Achievement With A Complete Very Long Accessible Label';
const definitions = (): BadgeDef<FixtureFacts>[] => [
  { id: 'fixture-first', emoji: '🧭', label: 'Fixture first step', blurb: 'Reach one fictional milestone.', test: vi.fn(f => f.milestones >= 1) },
  { id: 'fixture-second', emoji: '🏅', label: longLabel, blurb: 'Reach two fictional milestones.', test: vi.fn(f => f.milestones >= 2) },
  { id: 'fixture-third', emoji: '💎', label: 'Fixture final step', blurb: 'Reach three fictional milestones.', test: vi.fn(f => f.milestones >= 3) },
];
const cards = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>('[data-career-badge]'));
const icon = (card: HTMLElement) => card.querySelector('[data-badge-icon]');

afterEach(cleanup);

describe('shared career badge feedback', () => {
  it('keeps an empty case quiet with its exact count', () => {
    const view = render(<BadgeGrid defs={[]} earned={[]} />);
    expect(view.getByText('0 of 0')).toBeVisible();
    expect(cards(view.container)).toHaveLength(0);
    expect(view.container.querySelector(`.${motion.earned}`)).toBeNull();
    expect(view.container.querySelector(`.${motion.icon}`)).toBeNull();
  });

  it('keeps all locked cards quiet with their original labels and requirements', () => {
    const defs = definitions();
    const view = render(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 0 })} />);
    expect(view.getByText('0 of 3')).toBeVisible();
    expect(cards(view.container)).toHaveLength(3);
    cards(view.container).forEach((card, index) => {
      expect(card).toHaveAttribute('data-earned', 'false');
      expect(card).toHaveClass('opacity-60');
      expect(card).not.toHaveClass(motion.earned);
      expect(icon(card)).toHaveTextContent('🔒');
      expect(icon(card)).not.toHaveClass(motion.icon);
      expect(card).toHaveTextContent(defs[index].label);
      expect(card).toHaveTextContent(defs[index].blurb);
    });
    expect(view.queryByRole('button')).toBeNull();
  });

  it('binds finite feedback only to the real evaluator earned results', () => {
    const defs = definitions();
    const facts = Object.freeze({ milestones: 2 });
    const earned = earnedBadges(defs, facts);
    expect(earned).toEqual([defs[0], defs[1]]);
    const before = defs.map(def => ({ ...def }));
    const view = render(<BadgeGrid defs={defs} earned={earned} />);
    expect(view.getByText('2 of 3')).toBeVisible();
    cards(view.container).forEach((card, index) => {
      expect(card).toHaveAttribute('data-career-badge', defs[index].id);
      expect(card).toHaveAttribute('data-earned', index < 2 ? 'true' : 'false');
      expect(card).toHaveTextContent(defs[index].label);
      expect(card).toHaveTextContent(defs[index].blurb);
      if (index < 2) {
        expect(card).toHaveClass(motion.earned, 'bg-gold/10');
        expect(icon(card)).toHaveClass(motion.icon);
        expect(icon(card)).toHaveTextContent(defs[index].emoji);
      } else {
        expect(card).not.toHaveClass(motion.earned);
        expect(icon(card)).not.toHaveClass(motion.icon);
      }
    });
    expect(defs).toEqual(before);
    defs.forEach(def => expect(def.test).toHaveBeenCalledTimes(1));
    expect(facts).toEqual({ milestones: 2 });
  });

  it('unlocks in place and preserves card and icon identity through cloned props', () => {
    const defs = definitions();
    const view = render(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 0 })} />);
    const originalCards = cards(view.container);
    const originalIcons = originalCards.map(icon);
    const originalLabels = originalCards.map(card => card.querySelector('[title]'));
    view.rerender(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 1 })} />);
    expect(originalCards[0]).toHaveClass(motion.earned);
    expect(originalIcons[0]).toHaveClass(motion.icon);
    expect(view.getByText('1 of 3')).toBeVisible();
    view.rerender(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 2 })} />);
    expect(originalCards[1]).toHaveClass(motion.earned);
    expect(originalIcons[1]).toHaveClass(motion.icon);
    expect(originalCards[2]).not.toHaveClass(motion.earned);
    expect(originalIcons[2]).not.toHaveClass(motion.icon);
    const classNames = originalCards.map(card => [card.className, icon(card)!.getAttribute('class')]);
    const clonedDefs = defs.map(def => ({ ...def }));
    const clonedEarned = earnedBadges(clonedDefs, { milestones: 2 }).map(def => ({ ...def })).reverse();
    view.rerender(<BadgeGrid defs={clonedDefs} earned={clonedEarned} />);
    cards(view.container).forEach((card, index) => {
      expect(card).toBe(originalCards[index]);
      expect(icon(card)).toBe(originalIcons[index]);
      expect(card.querySelector('[title]')).toBe(originalLabels[index]);
      expect([card.className, icon(card)!.getAttribute('class')]).toEqual(classNames[index]);
    });
    expect(view.getByText('2 of 3')).toBeVisible();
  });

  it('shows earlier career facts as locked again without replacing badge cards', () => {
    const defs = definitions();
    const view = render(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 3 })} />);
    const before = cards(view.container);
    view.rerender(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 0 })} />);
    expect(view.getByText('0 of 3')).toBeVisible();
    cards(view.container).forEach((card, index) => {
      expect(card).toBe(before[index]);
      expect(card).toHaveAttribute('data-earned', 'false');
      expect(card).not.toHaveClass(motion.earned);
      expect(icon(card)).not.toHaveClass(motion.icon);
      expect(icon(card)).toHaveTextContent('🔒');
    });
  });

  it('retains the complete label in DOM and title for earned and locked badges', () => {
    const defs = definitions();
    defs[2].label = 'FixtureUnbrokenAchievementNameWithEveryOriginalLetterAccessible';
    const view = render(<BadgeGrid defs={defs} earned={earnedBadges(defs, { milestones: 2 })} />);
    cards(view.container).forEach((card, index) => {
      const label = within(card).getByTitle(defs[index].label);
      expect(label.textContent).toBe(defs[index].label);
      expect(label).toHaveClass('min-w-0', 'truncate');
      expect(card).toContainElement(label);
      expect(card).toHaveClass('min-w-0');
      expect(card.querySelectorAll('p')[1].textContent).toBe(defs[index].blurb);
    });
  });
});
