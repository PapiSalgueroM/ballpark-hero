/* Round 207: the extension screen, one file, four games.

   The sibling of FreeAgencyPanel (Round 179). The engine is
   usCareerExtension.ts; this file is only the card.

   It shows both numbers on purpose. The offer and what the open market
   would pay sit next to each other, because the whole decision is which of
   those two you would rather have, and a screen that hid the market number
   would be asking you to guess instead of choose.

   House rules it follows: one card, no stacking, full width buttons for a
   phone, and the way out is always visible: turning it down is a button,
   not a corner. */

import { PenLine, TrendingUp } from 'lucide-react';
import { extensionHeadline } from '@/lib/usCareerExtension';
import type { ExtensionTalk } from '@/lib/usCareerExtension';
import { cn } from '@/lib/utils';

interface Props {
  talk: ExtensionTalk;
  /** The sport's word for the year you are about to play. */
  seasonWord: string;
  onPush: () => void;
  onSign: () => void;
  onDecline: () => void;
}

export default function ExtensionCard({ talk, seasonWord, onPush, onSign, onDecline }: Props) {
  const o = talk.offer;
  /* Under, at, or over what the market would pay. Stated as a fact, not as
     advice: the card never tells you which one to take. */
  const gap = o ? Math.round(((o.salary - talk.market) / Math.max(0.1, talk.market)) * 100) : 0;
  return (
    <div className="space-y-3" data-extension-talk>
      <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">
          <PenLine className="mr-1 inline h-4 w-4 text-gold" /> The final year
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This is the last {seasonWord} on your deal. Sign the extension and you are set,
          usually a little under what the open market pays. Turn it down and you play the
          year out and reach free agency, where everybody bids and nothing is promised.
        </p>
        <p className="mt-1 text-[11px] font-semibold text-gold">{talk.note}</p>
      </div>

      {o ? (
        <div className={cn('rounded-2xl border bg-card p-3', talk.pushed ? 'border-border' : 'border-primary/50')}>
          <div className="flex items-center justify-between">
            <span className="min-w-0 truncate font-display text-sm font-bold text-foreground">{talk.label}</span>
            <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
              {o.mood === 'eager' ? 'Keen' : o.mood === 'fair' ? 'Fair' : 'Lukewarm'}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {/* data-ext-salary so a harness reads the OFFER rather than the
                first dollar figure on the card, which is the market number. */}
            <div className="rounded-xl border border-border bg-background px-2 py-1.5" data-ext-salary={o.salary}>
              <p className="text-sm font-black text-foreground">${o.salary}M</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">a year</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-2 py-1.5">
              <p className="text-sm font-black text-foreground">{o.years}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">year{o.years === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-xl border border-border bg-background px-2 py-1.5">
              <p className={cn('text-sm font-black', gap >= 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                {gap >= 0 ? '+' : ''}{gap}%
              </p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">vs market</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{o.line}</p>
          <div className="mt-3 grid gap-1.5">
            <button
              onClick={onSign}
              className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Sign it: {extensionHeadline(talk)}
            </button>
            <button
              onClick={onPush}
              disabled={talk.pushed}
              className="w-full rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-40"
            >
              <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
              {talk.pushed ? 'You have made your case' : 'Ask for more, once'}
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={onDecline}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm font-bold text-muted-foreground hover:border-gold hover:text-foreground"
      >
        {o ? 'Turn it down and play the year out' : 'Play the year out'}
      </button>
    </div>
  );
}
