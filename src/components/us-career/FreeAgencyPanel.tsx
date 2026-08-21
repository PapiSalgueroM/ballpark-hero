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
   and front offices, never to a named real person. Keep it that way. */

import { Handshake, TrendingUp } from 'lucide-react';
import { FA_TIER_WORD, faTotalValue } from '@/lib/usCareerFreeAgency';
import type { FaWindow } from '@/lib/usCareerFreeAgency';
import { cn } from '@/lib/utils';

interface Props {
  window: FaWindow;
  /** 'a team' flavor word for the header: franchise, club, etc. */
  sportNoun: string;
  /** The one line from the last push, shown under the header. */
  talkLine: string | null;
  onPush: (index: number) => void;
  onSign: (index: number) => void;
}

export default function FreeAgencyPanel({ window: w, sportNoun, talkLine, onPush, onSign }: Props) {
  return (
    /* data-fa-window scopes the browser harness to this screen, because the
       sitewide ticker above it also talks about teams and signings. */
    <div className="space-y-3" data-fa-window>
      <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">🖊️ Free agency</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your deal is up. Every {sportNoun} below is a real destination with its own money,
          length and roster. You can push any offer for more, once. Push too hard and an
          offer can disappear, but your own {sportNoun} never walks away.
        </p>
        <p className="mt-1 text-[11px] font-semibold text-gold">{w.note}</p>
        {talkLine && <p className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs text-foreground">{talkLine}</p>}
      </div>

      <div className="space-y-2">
        {w.offers.map((o, i) => (
          <div
            key={`${o.team}-${i}`}
            className={cn(
              'rounded-2xl border p-3',
              o.gone ? 'border-border bg-card opacity-45' : o.incumbent ? 'border-gold/50 bg-card' : 'border-border bg-card',
            )}
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
            {!o.gone && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onSign(i)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  <Handshake className="h-3.5 w-3.5" /> Sign
                </button>
                <button
                  onClick={() => onPush(i)}
                  disabled={o.pushed}
                  className={cn(
                    'flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold',
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
        ))}
      </div>
    </div>
  );
}
