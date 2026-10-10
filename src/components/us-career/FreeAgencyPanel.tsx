/* Round 179: one free agency screen, four games.

   Same move as CoachCareerPanel (Round 126): the four US career games all
   need the identical screen, so it exists once. The engine behind it is
   usCareerFreeAgency.ts; this file is only the cards.

   House rules it follows:
     THE TILE RULE. Each offer is its own small card. Nothing stacks long.
     NO SCROLL RULE. The parent board keys its useRevealScroll on the phase,
     so entering free agency pulls this into view; pushes re render in place.
     PHONES. Full width buttons, truncating team names, wrapping chip rows.

   Legal note: pitches come from the engine and are attributed to franchises
   and front offices, never to a named real person. Keep it that way.

   Round 530: the market opens as a moment. The header rises, the offers
   tick in one by one in the order the engine sorted them (incumbent first,
   then best money down), and the line from a push rises in under the
   header, keyed on its text so only a new line moves. The board mounts this
   panel when the window opens, so "on mount" is "a new window"; a push
   re-renders the same cards in place. Every dollar figure is final from
   frame one (Round 147). Reduced motion lands on the final frame through
   CelebrationStyles. */

import { useLayoutEffect, useRef, useState } from 'react';
import { Handshake, TrendingUp } from 'lucide-react';
import { CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import { FA_TIER_WORD, faTotalValue } from '@/lib/usCareerFreeAgency';
import type { FaOffer, FaWindow } from '@/lib/usCareerFreeAgency';
import { cn } from '@/lib/utils';
import motion from './FreeAgencyFeedback.module.css';
import type { MarketResult, MarketWheel } from '@/lib/usCareerMarket';
import MarketChanceWheel from './MarketChanceWheel';
import MarketCompare from './MarketCompare';

interface Props {
  window: FaWindow;
  /** 'a team' flavor word for the header: franchise, club, etc. */
  sportNoun: string;
  /** The one line from the last push, shown under the header. */
  talkLine: string | null;
  onPush: (index: number) => void;
  onSign: (index: number) => void;
  wheel?: MarketWheel;
  onWheelContinue?: () => void;
  compare?: boolean;
  odds?: Record<MarketResult, number>[];
}

interface PushIntent {
  index: number;
  offer: FaOffer;
  window: FaWindow;
  opener: HTMLButtonElement;
}

export default function FreeAgencyPanel({ window: w, sportNoun, talkLine, onPush, onSign, wheel, onWheelContinue, compare = false, odds }: Props) {
  const [intent, setIntent] = useState<PushIntent | null>(null);
  const [comparing, setComparing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const returnPush = useRef<number | null>(null);
  const compareReturn = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (wheel && !wheel.seen) { returnPush.current = wheel.offerIndex; return; }
    if (returnPush.current !== null) {
      const index = returnPush.current;
      returnPush.current = null;
      const target = root.current?.querySelector<HTMLButtonElement>(`[data-fa-sign="${index}"]`)
        ?? root.current?.querySelector<HTMLButtonElement>('[data-fa-sign]');
      target?.focus({ preventScroll: true });
    }
    if (!comparing && compareReturn.current !== null) {
      const y = compareReturn.current;
      compareReturn.current = null;
      root.current?.querySelector<HTMLButtonElement>('[data-market-compare-open]')?.focus({ preventScroll: true });
      window.scrollTo({ top: y, behavior: 'auto' });
    }
  }, [wheel, comparing]);
  const focusRequest = useRef<PushIntent | null>(null);
  const receipt = useRef<HTMLParagraphElement>(null);
  const settled = intent && w !== intent.window ? w.offers[intent.index] : null;
  const accepted = intent && settled?.team === intent.offer.team && settled.pushed;
  const annualChange = accepted ? Math.round((settled.salary - intent.offer.salary) * 10) / 10 : 0;
  const yearsChange = accepted ? settled.years - intent.offer.years : 0;
  const totalChange = accepted ? Math.round((faTotalValue(settled) - faTotalValue(intent.offer)) * 10) / 10 : 0;
  const outcome = accepted ? settled.gone ? 'withdrawn' : annualChange || yearsChange ? 'raised' : 'held' : null;
  const changes = [
    annualChange ? `${annualChange > 0 ? '+' : '-'}$${Math.abs(annualChange)}M a year` : null,
    yearsChange ? `${yearsChange > 0 ? '+' : ''}${yearsChange} year${Math.abs(yearsChange) === 1 ? '' : 's'}` : null,
    totalChange ? `${totalChange > 0 ? '+' : '-'}$${Math.abs(totalChange)}M total` : null,
  ].filter(Boolean);
  const resultLine = outcome === 'withdrawn' ? 'Offer withdrawn. Choose another deal.'
    : outcome === 'held' ? 'Offer held. The terms did not change.'
    : `Offer updated: ${changes.join(', ')}.`;

  useLayoutEffect(() => {
    if (!intent) return;
    if (!outcome) {
      focusRequest.current = null;
      setIntent(null);
      return;
    }
    if (focusRequest.current !== intent) return;
    focusRequest.current = null;
    const active = document.activeElement;
    if (active === intent.opener || active === document.body || !active?.isConnected) receipt.current?.focus({ preventScroll: true });
  }, [intent, outcome]);

  const push = (index: number, opener: HTMLButtonElement) => {
    const offer = w.offers[index];
    if (!offer || offer.pushed || offer.gone) return;
    const request = { index, offer: { ...offer }, window: w, opener };
    focusRequest.current = request;
    setIntent(request);
    onPush(index);
  };

  if (wheel && !wheel.seen && onWheelContinue) return <div ref={root}><MarketChanceWheel wheel={wheel} onContinue={onWheelContinue} /></div>;
  if (comparing) return <div ref={root}><MarketCompare window={w} onBack={() => setComparing(false)} /></div>;
  return (
    /* data-fa-window scopes the browser harness to this screen, because the
       sitewide ticker above it also talks about teams and signings. */
    <div ref={root} className="space-y-3" data-fa-window>
      <CelebrationStyles />
      {compare && <button type="button" data-market-compare-open onClick={() => { compareReturn.current = window.scrollY; setComparing(true); }}
        className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-xs font-bold">Compare offers</button>}
      <div className="cm-rise rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">🖊️ Free agency</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your deal is up. Every {sportNoun} below is a real destination with its own money,
          length and roster. You can push any offer for more, once. Push too hard and an
          offer can disappear, but your own {sportNoun} never walks away.
          {compare && <> Your offers and each spent push survive reload. A wheel reveals the saved negotiation, never another attempt. For example, a 30% chance fills 30 of 100 equal parts; it does not promise a raise.</>}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-gold">{w.note}</p>
        {talkLine && <p key={talkLine} className="cm-rise mt-2 rounded-xl bg-secondary px-3 py-2 text-xs text-foreground">{talkLine}</p>}
      </div>

      <div className="space-y-2">
        {w.offers.map((o, i) => (
          /* Round 530 review: the tick in sits on a wrapper, not on the card.
             It fills forwards at opacity 1, and an animated value outranks a
             normal rule, so with both on one element a withdrawn offer could
             never dim once the tick had run; under reduced motion the kit's
             own .cm-tick-in { opacity: 1 } beat the dim as well. Same split
             GmPressCard uses for its hover scale. */
          <div key={`${o.team}-${i}`} className="cm-tick-in" style={{ animationDelay: revealDelay(i, 0.3, 0.14) }}>
            <div
              className={cn(
                'rounded-2xl border p-3',
                o.gone ? 'border-border bg-card opacity-45' : o.incumbent ? 'border-gold/50 bg-card' : 'border-border bg-card',
                intent?.index === i && outcome && motion.offer,
              )}
              data-fa-offer={i}
              data-fa-feedback={intent?.index === i && outcome ? outcome : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-black text-foreground">
                  {o.label}
                  {o.incumbent && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">Your team</span>}
                </p>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{FA_TIER_WORD[o.tier]}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">${o.salary}M x {o.years} yr{o.years === 1 ? '' : 's'}</span>
                <span>${faTotalValue(o)}M total</span>
                <span>Roster {o.quality}</span>
              </div>
              <p className="mt-1 text-[11px] italic text-muted-foreground">{o.gone ? 'Offer withdrawn.' : `"${o.pitch}"`}</p>
              {intent?.index === i && outcome && (
                <p ref={receipt} role="status" tabIndex={-1} data-fa-result={outcome}
                  className={cn('mt-2 rounded-lg bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', motion.receipt)}>
                  {resultLine}
                </p>
              )}
              {!o.pushed && odds?.[i] && <p className="mt-2 text-[11px] text-muted-foreground" data-market-odds={i}>
                Before you push: <span data-market-chance="raised" data-probability={odds[i].raised}>Raise accepted {Math.round(odds[i].raised * 1000) / 10}%</span>
                {' · '}<span data-market-chance="held" data-probability={odds[i].held}>Held {Math.round(odds[i].held * 1000) / 10}%</span>
                {' · '}<span data-market-chance="withdrawn" data-probability={odds[i].withdrawn}>Withdrawn {Math.round(odds[i].withdrawn * 1000) / 10}%</span>
              </p>}
              {!o.gone && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    data-fa-sign={onWheelContinue ? i : undefined}
                    onClick={() => onSign(i)}
                    className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                  >
                    <Handshake className="h-3.5 w-3.5" /> Sign
                  </button>
                  <button
                    data-fa-push={onWheelContinue ? i : undefined}
                    onClick={event => push(i, event.currentTarget)}
                    disabled={o.pushed}
                    className={cn(
                      'flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold',
                      o.pushed
                        ? 'cursor-not-allowed border-border text-muted-foreground opacity-50'
                        : 'border-gold/50 text-gold hover:bg-gold/10',
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> {o.pushed ? 'Talks done' : 'Push for more'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
