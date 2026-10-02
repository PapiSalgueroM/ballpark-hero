import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import {
  buildMarket, makeOffer, moneyIn, offerTerms, startCareer, startNegotiation,
  type CareerState, type MarketPlayer, type Negotiation,
} from '@/lib/clubManager';

/* Round 927: the deal moment. A negotiation leaving 'open' lands (or stings)
   ONCE, at the flip, and never on a screen opened onto a deal that had already
   closed. Every state below is written by the real engine on a real career, or
   is the engine's own open state with the status the engine would write. No
   player, club or figure is made up here. */

const noop = () => {};
function Screen({ career, market }: { career: CareerState; market: MarketPlayer[] }) {
  return (
    <TransferScreen
      career={career} market={market}
      onNegotiate={noop} onOffer={noop} onWalk={noop} onDismissNegotiation={noop}
      onClause={noop} onLoan={noop} onAcceptBid={noop} onRejectBid={noop}
      onSetStatus={noop} onLoanOut={noop} onProposeTerms={noop} onBuyLoanee={noop}
      onEndLoanEarly={noop} onRecallLoanee={noop}
    />
  );
}

/** The engine draws from Math.random, so the test gives it a fixed stream. */
function seedRandom(seed: number) {
  let s = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  });
}

interface Deal { market: MarketPlayer[]; open: CareerState; agreed: CareerState }

/** Open talks with an affordable man, shake on the fee, give him his terms. */
function playDeal(): Deal {
  const base = startCareer('Brentford');
  expect(base.transferWindow).not.toBeNull();
  const market = buildMarket(base);
  for (const mp of [...market].sort((a, b) => a.price - b.price)) {
    const open = startNegotiation(base, mp);
    if (!open?.negotiation) continue;
    if (open.negotiation.theirAsk > base.budget * 0.5) break;
    const fee = makeOffer(open, open.negotiation.theirAsk);
    const want = fee?.negotiation?.terms?.want;
    if (!fee || !want) continue;
    const agreed = offerTerms(fee, want);
    if (agreed?.negotiation?.status !== 'agreed') continue;
    return { market, open, agreed };
  }
  throw new Error('the engine agreed no deal on this seed: pick another seed');
}

const card = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-testid="cm-deal-card"]');
const statusWords = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-testid="cm-deal-status"]');
const count = (c: HTMLElement, cls: string) => c.querySelectorAll(`.${cls}`).length;
const closed = (open: CareerState, status: Negotiation['status'], note: string): CareerState => ({
  ...open,
  negotiation: { ...open.negotiation!, status, note },
});

beforeEach(() => seedRandom(927));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager: the deal moment', () => {
  it('slams DEAL DONE only after the flip, with the fee the save holds', () => {
    const { market, open, agreed } = playDeal();
    const neg = agreed.negotiation!;
    expect(typeof neg.agreedFee).toBe('number');

    const view = render(<Screen career={open} market={market} />);
    expect(statusWords(view.container)).toHaveTextContent('Negotiating');
    expect(count(view.container, 'cm-slam')).toBe(0);
    expect(count(view.container, 'cm-win-pulse')).toBe(0);
    expect(view.container.querySelector('[data-testid="cm-deal-slip"]')).toBeNull();

    view.rerender(<Screen career={agreed} market={market} />);
    expect(statusWords(view.container)).toHaveTextContent('DEAL DONE');
    expect(statusWords(view.container)).toHaveClass('cm-slam');
    expect(statusWords(view.container)!.tagName).toBe('SPAN');
    expect(card(view.container)).toHaveClass('cm-win-pulse');
    expect(card(view.container)!.tagName).toBe('DIV');
    expect(count(view.container, 'cm-loss-shake')).toBe(0);
    expect(count(view.container, 'cm-confetti')).toBe(0);

    const fee = view.container.querySelector('[data-testid="cm-deal-fee"]')!;
    expect(fee.textContent).toBe(moneyIn(agreed)(neg.agreedFee!));
    const slip = view.container.querySelector('[data-testid="cm-deal-slip"]')!;
    expect(slip).toHaveClass('cm-rise');
    expect(slip.textContent).toBe(
      `${neg.player.name} signs from ${neg.player.club} for ${moneyIn(agreed)(neg.agreedFee!)}.`,
    );

    /* The ledger row this deal wrote is the one that ticks in, and only it. */
    const fresh = view.container.querySelectorAll('[data-fresh-row]');
    expect(fresh.length).toBe(agreed.seasonSignings.length - open.seasonSignings.length);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh[0]).toHaveClass('cm-tick-in');
    expect(fresh[0].textContent).toContain(neg.player.name);
    expect(count(view.container, 'cm-tick-in')).toBe(fresh.length);

    /* No animated class ever sits on a control. */
    for (const b of view.container.querySelectorAll('button')) {
      expect(b.className).not.toMatch(/\bcm-(slam|rise|tick-in|win-pulse|loss-shake)\b/);
    }
  });

  it('plays nothing when the screen opens onto a deal that was already done', () => {
    const { market, open, agreed } = playDeal();
    const flipped = render(<Screen career={open} market={market} />);
    flipped.rerender(<Screen career={agreed} market={market} />);
    const atTheFlip = flipped.container.innerHTML;
    cleanup();

    const reopened = render(<Screen career={agreed} market={market} />);
    expect(statusWords(reopened.container)).toHaveTextContent('DEAL DONE');
    for (const cls of ['cm-slam', 'cm-win-pulse', 'cm-rise', 'cm-tick-in', 'cm-loss-shake']) {
      expect(count(reopened.container, cls)).toBe(0);
    }
    expect(reopened.container.querySelector('[data-fresh-row]')).toBeNull();
    /* The facts stay: the slip and its fee are there without the moment. */
    expect(reopened.container.querySelector('[data-testid="cm-deal-fee"]')!.textContent)
      .toBe(moneyIn(agreed)(agreed.negotiation!.agreedFee!));

    /* No layout shift, by construction: the moment adds classes that touch
       only opacity, transform and shadow, a delay, and two data attributes.
       Take those away and the two trees are the same tree. */
    const strip = (html: string) => html
      .replace(/ data-(deal-moment|fresh-row)="[^"]*"/g, '')
      .replace(/ style="animation-delay: [^"]*"/g, '')
      .replace(/ cm-(slam|win-pulse|rise|tick-in)(?=[ "])/g, '');
    expect(atTheFlip).not.toBe(reopened.container.innerHTML);
    /* Both sides go through the same strip: the kit's own style block names
       these classes in a comment, and it is the same block on both. */
    expect(strip(atTheFlip)).toBe(strip(reopened.container.innerHTML));
  });

  it('plays once: a later render keeps the node and a new negotiation is clean', () => {
    const { market, open, agreed } = playDeal();
    const view = render(<Screen career={open} market={market} />);
    view.rerender(<Screen career={agreed} market={market} />);
    const words = statusWords(view.container);
    const box = card(view.container);

    /* Something else on the save moves. Same deal, same nodes, so the browser
       has nothing to restart. */
    view.rerender(<Screen career={{ ...agreed, budget: agreed.budget }} market={market} />);
    expect(statusWords(view.container)).toBe(words);
    expect(card(view.container)).toBe(box);
    expect(words).toHaveClass('cm-slam');

    /* Back to the market, then a fresh table with somebody else. */
    view.rerender(<Screen career={{ ...agreed, negotiation: null }} market={market} />);
    expect(card(view.container)).toBeNull();
    view.rerender(<Screen career={open} market={market} />);
    expect(statusWords(view.container)).toHaveTextContent('Negotiating');
    for (const cls of ['cm-slam', 'cm-win-pulse', 'cm-rise', 'cm-tick-in', 'cm-loss-shake']) {
      expect(count(view.container, cls)).toBe(0);
    }
  });
});
