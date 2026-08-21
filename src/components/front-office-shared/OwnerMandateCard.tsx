/* Round 180: the owner card, one component, four GM games.

   Renders the mandate the engine (foOwnerMandate.ts) set, the trust bar,
   and the live on-track read mid-season. Same shared-screen move as
   FreeAgencyPanel (179) and CoachCareerPanel (126). Narrated words only,
   never quoted speech; see the engine header for why. */

import { cn } from '@/lib/utils';
import type { OwnerMandate } from '@/lib/foOwnerMandate';

interface Props {
  mandate: OwnerMandate;
  trust: number;
  /** Live read while the season runs; null hides the chip (offseason). */
  pace: { onTrack: boolean; line: string } | null;
}

export default function OwnerMandateCard({ mandate, trust, pace }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3" data-owner-mandate>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">🏛️ Ownership</span>
        <span className={cn('font-black', trust > 55 ? 'text-emerald-400' : trust > 25 ? 'text-gold' : 'text-destructive')}>
          Trust {trust}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full transition-all duration-700', trust > 55 ? 'bg-emerald-400' : trust > 25 ? 'bg-gold' : 'bg-destructive')}
          style={{ width: `${trust}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-foreground">{mandate.text}</p>
      {pace && (
        <p className={cn('mt-1 text-[11px] font-semibold', pace.onTrack ? 'text-emerald-400' : 'text-destructive')}>
          {pace.onTrack ? '📈 ' : '📉 '}{pace.line}
        </p>
      )}
      {trust <= 25 && (
        <p className="mt-1 text-[11px] font-bold text-destructive">One more bad season ends this. The seat is hot.</p>
      )}
    </div>
  );
}
