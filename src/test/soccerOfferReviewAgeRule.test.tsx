/**
 * Release AW fix pass (review sc-screens F7).
 *
 * From 30 a new club's wage follows age and form (Rounds 1262 to 1264). The club's own extension printed its
 * reason, a new club's offer printed none, and the ? of the contract review spoke of the agent only. The help
 * now carries the rule and an example. This file holds the two things that can go wrong with a rule written
 * in copy: that the paragraph is behind the ? at all, and that every number in it is still the number
 * soccerTransferTerms pays (so a later change of the policy fails here and points at the sentence).
 *
 * Control, on a runner's copy only: the rule paragraph is taken out of the help again
 * (.rc/x/fxMut.mjs agerule) and the first case fails.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoccerOfferReview } from '@/components/soccer-career/SoccerOfferReview';
import { soccerTransferTerms } from '@/lib/soccerCareerContracts';

afterEach(() => { cleanup(); localStorage.clear(); });

const review = { signedWage: 850, current: { club: 'Rivertown FC', wage: 1000, years: 1 }, currentReason: null,
  wageDelta: -150, years: 1, season: 2031, depth: null };
/** What a new club's drawn 1000 a week becomes for this player. */
const pays = (age: number, overall: number, rating: number, apps = 30) =>
  soccerTransferTerms({ age, overall, weeklyWage: 1000, seasons: [{ type: 'playing', rating, apps }] }, 1000, 3).wage;

describe('the contract review says how a new club pays from 30', () => {
  it('the rule and its example are behind the ?', () => {
    render(<SoccerOfferReview club="Harbour City" review={review} onAccept={vi.fn()} />);
    fireEvent.click(document.querySelector<HTMLButtonElement>('[aria-label="Review contract with Harbour City"]')!);
    const pane = document.querySelector<HTMLElement>('[data-soccer-offer-review]')!;
    expect(pane).toBeVisible();
    expect(pane.querySelector('[data-offer-review-help]'), 'the review opens on the terms, not the help').toBeNull();
    fireEvent.click(pane.querySelector<HTMLButtonElement>('[aria-label="Contract review help"]')!);
    const help = pane.querySelector<HTMLElement>('[data-offer-review-help]')!;
    const rule = help.querySelector<HTMLElement>('[data-offer-review-age-rule]');
    expect(rule, 'the pay rule is in the help').not.toBeNull();
    const text = rule!.textContent ?? '';
    for (const part of ['From 30', 'overall 90 or more', 'rated 8 or better with 20 appearances', '10% more (5% more from 34)',
      'overall 80 or more off a season rated 7 or better it is the same money', '5% less (15% less from 34)',
      'another 5% comes off after a season rated under 6.7']) expect(text, part).toContain(part);
    expect(help).toHaveTextContent('Example: with No Agent, at 35, with an overall of 76 and a latest season rated 7.1, a €1000 offer is made at €850 a week.');
    /* The agent's example the other lane's walk reads is still there, word for word. */
    expect(help).toHaveTextContent('Example: a €1000 base offer with a 10% increase signs at €1100 a week. Against a €1000 current wage, that is €100 more each week.');
  });

  it('every number in that paragraph is what the engine pays', () => {
    /* 10% more, or 5% more from 34: overall 90, a season rated 8 with 20 appearances. */
    expect([pays(30, 90, 8, 20), pays(33, 95, 8.6), pays(34, 90, 8, 20), pays(38, 92, 9)]).toEqual([1100, 1100, 1050, 1050]);
    /* One short of any of the three is not that band. */
    expect([pays(31, 89, 8.5), pays(31, 93, 7.9), pays(31, 93, 8.5, 19)]).toEqual([1000, 1000, 1000]);
    /* The same money: overall 80 and a season rated 7. */
    expect([pays(30, 80, 7), pays(36, 85, 7.4)]).toEqual([1000, 1000]);
    /* Anyone else: 5% less, 15% less from 34, and another 5% under 6.7. */
    expect([pays(31, 79, 7.5), pays(31, 84, 6.9), pays(35, 79, 7.5), pays(35, 84, 6.7)]).toEqual([950, 950, 850, 850]);
    expect([pays(31, 79, 6.69), pays(35, 70, 6.2)]).toEqual([900, 800]);
    /* The example of the help. */
    expect(pays(35, 76, 7.1)).toBe(850);
    /* Under 30 the offer is the offer. */
    expect([pays(29, 95, 9), pays(29, 60, 5.5), pays(18, 70, 6)]).toEqual([1000, 1000, 1000]);
  });
});
