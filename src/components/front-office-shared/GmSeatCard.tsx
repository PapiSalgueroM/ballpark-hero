/* Round 941: the GM seat card, one component for every manager seat.

   Three states, all drawn from src/lib/gmSeat.ts and nothing computed here:
   - In the seat: the ask from upstairs in the seat's own words, and trust.
   - A buyout bid on the table (college only): go, or stay put.
   - Between seats: the sacking line, the feed of offers you earned, and the
     choice to take one or sit the year out. An empty feed says so plainly.

   The buttons only report the choice. The board that binds this card applies
   it: takeSeat and startSeatStint for a job, sitOutYear for a year out. The
   words on each button say exactly that and nothing more. Narrated only,
   every speaker a role, never a quote. */

import { cn } from '@/lib/utils';
import type { OwnerMandate } from '@/lib/foOwnerMandate';
import type { GmSeatPack, SeatOffer } from '@/lib/gmSeat';

export const SEAT_TIER_LABEL = ['', 'Top tier', 'Upper half', 'Lower half', 'Bottom tier'] as const;

interface Props {
  pack: GmSeatPack;
  /** The ask for the seat you hold; null while you are between seats. */
  mandate: OwnerMandate | null;
  trust: number;
  /** Between seats: the sacking line and the feed. Null while you hold a seat. */
  market?: { line: string; offers: SeatOffer[]; seasonsOut: number } | null;
  /** A buyout bid while you hold the seat. Only a college pack ever makes one. */
  bid?: SeatOffer | null;
  onTake?: (offer: SeatOffer) => void;
  onSitOut?: () => void;
  onStay?: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function OfferRow({ offer, label, onPick }: { offer: SeatOffer; label: string; onPick?: (o: SeatOffer) => void }) {
  return (
    <li className="rounded-xl border border-border bg-secondary/40 p-2" data-seat-offer={offer.teamId}>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-black text-foreground">{offer.teamName}</span>
        <span className="font-bold uppercase tracking-wider text-muted-foreground">{SEAT_TIER_LABEL[offer.tier]}</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-foreground">{offer.ask.text}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{offer.reason}</p>
      {onPick && (
        <button
          type="button"
          onClick={() => onPick(offer)}
          className="mt-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-black text-primary-foreground"
        >
          {label}
        </button>
      )}
    </li>
  );
}

export default function GmSeatCard({ pack, mandate, trust, market = null, bid = null, onTake, onSitOut, onStay }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3" data-gm-seat={pack.id}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">🏛️ {cap(pack.upstairs)}</span>
        {mandate && !market && (
          <span className={cn('font-black', trust > 55 ? 'text-emerald-400' : trust > 25 ? 'text-gold' : 'text-destructive')}>
            Trust {trust}
          </span>
        )}
      </div>

      {mandate && !market && <p className="mt-1.5 text-[11px] leading-snug text-foreground">{mandate.text}</p>}

      {bid && !market && (
        <div className="mt-2" data-seat-bid>
          <p className="text-[11px] font-semibold text-foreground">
            {bid.teamName} will pay your buyout to make you their {pack.role}.
          </p>
          <ul className="mt-1.5 space-y-1.5">
            <OfferRow offer={bid} label={`Go to ${bid.teamName}`} onPick={onTake} />
          </ul>
          {onStay && (
            <button type="button" onClick={onStay} className="mt-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-foreground">
              Stay put
            </button>
          )}
        </div>
      )}

      {market && (
        <div className="mt-1.5" data-seat-market>
          <p className="text-[11px] leading-snug text-foreground">{market.line}</p>
          {market.seasonsOut > 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {market.seasonsOut} season{market.seasonsOut === 1 ? '' : 's'} out of work. Every year out makes the phone quieter.
            </p>
          )}
          {market.offers.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5">
              {market.offers.map(o => <OfferRow key={o.teamId} offer={o} label="Take the job" onPick={onTake} />)}
            </ul>
          ) : (
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground" data-seat-empty>
              No {pack.seat} is calling right now.
            </p>
          )}
          {onSitOut && (
            <button type="button" onClick={onSitOut} className="mt-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-foreground">
              Sit the year out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
